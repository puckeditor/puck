import {
  ComponentConfig,
  ComponentData,
  Config,
  Data,
  Field,
  Metadata,
  RootData,
  SelectField,
  walkTree,
} from "@puckeditor/core";

import type {
  BuiltInView,
  NodeViewState,
  ResolvedView,
  ValueType,
  ViewSources,
  ViewValueOption,
  ViewsPluginOptions,
  ViewsStorage,
} from "../types";

import {
  getTemplateExpressions,
  getWildcardTemplateExpressions,
  isTemplateString,
  replaceTemplateExpressionValue,
} from "./strings/templates";
import {
  getPathSegments,
  getPathString,
  getValueAtPath,
  getWildcardCount,
  getWildcardPathRegExp,
  isValidPathExpression,
  getPathToClosestWildcard,
} from "./strings/paths";
import { isPlainObject } from "./utils/is-plain-object";
import getValueType from "./utils/get-value-type";
import cloneObject from "./clone-object";
import { getFieldAtPath } from "./get-field-from-path";
import assignPathBinding from "./assign-path-binding";

export const DEFAULT_STORAGE_KEY = "__puck_views";
export const DEFAULT_NODE_STATE_KEY = "__puck_view_state";
export const RENDER_DATA_BINDING_KEY = "__puck_add_data_binding";

const inFlightQueries = new Map<string, Promise<any>>();

/**
 * Extracts the leading view ID from a template expression.
 *
 * @param expression The template expression to inspect
 * @returns The referenced view ID, if one exists
 */
const getTemplateViewId = (expression: string) => {
  const match = expression.trim().match(/^[a-zA-Z0-9_-]+/);

  return match?.[0] || null;
};

/**
 * Normalizes a static field path to its wildcard form using the closest matching array binding.
 *
 * @example
 * // closest array binding "items[*].nested[1].names[*]"
 * getWildcardFieldPath({
 *   fieldPath: "items[0].nested[1].names[2].title",
 *   bindings: { "items[*].nested[1].names[*]": ... },
 * });
 * // → "items[*].nested[1].names[*].title"
 *
 * @param fieldPath - The static field path to normalize.
 * @param bindings - The node's current view-state bindings, used to locate the closest wildcard ancestor (array binding).
 * @returns The normalized path with the closest wildcard positions replaced, or the original `fieldPath` if no matching binding is found.
 */
export const getWildcardFieldPath = ({
  fieldPath,
  bindings,
}: {
  fieldPath: string;
  bindings: NodeViewState["bindings"];
}) => {
  const bindingKey = getPathToClosestWildcard(fieldPath, Object.keys(bindings));

  if (!bindingKey) {
    return fieldPath;
  }

  return fieldPath.replace(getWildcardPathRegExp(bindingKey), bindingKey);
};

/**
 * Iterates over every view ID referenced by a node's bindings and templates.
 *
 * @param nodeState The node view state to inspect
 * @param callback The callback to invoke for each referenced view ID
 * @returns Nothing
 */
const forEachReferencedViewId = (
  nodeState: NodeViewState,
  callback: (viewId: string) => void
) => {
  Object.values(nodeState.bindings).forEach((binding) => {
    callback(binding.viewId);
  });

  Object.values(nodeState.templates).forEach((template) => {
    getTemplateExpressions(template).forEach((expression) => {
      const viewId = getTemplateViewId(expression);

      if (viewId) {
        callback(viewId);
      }
    });
  });
};

/**
 * Collects the unique view IDs referenced by a node's view state.
 *
 * @param nodeState The node view state to inspect
 * @returns The referenced view IDs
 */
const getReferencedViewIds = (nodeState: NodeViewState) => {
  const ids = new Set<string>();

  forEachReferencedViewId(nodeState, (viewId) => {
    ids.add(viewId);
  });

  return Array.from(ids);
};

/**
 * Formats a value for display in binding and template suggestions.
 *
 * @param value The value to format
 * @returns A human-readable preview string
 */
const formatPreview = (value: any) => {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Recursively adds value options for a view result and all nested values.
 *
 * @param options The accumulator that receives each option
 * @param value The current value being inspected
 * @param viewId The view ID the value belongs to
 * @param path The nested path to the current value
 * @returns Nothing
 */
const appendValueOptions = ({
  options,
  value,
  viewId,
  path = "",
}: {
  options: ViewValueOption[];
  value: any;
  viewId: string;
  path?: string;
}) => {
  options.push({
    viewId,
    path: Array.isArray(value) ? `${path}[*]` : path,
    expression: Array.isArray(value) ? `${path}[*]` : path,
    preview: formatPreview(value),
    valueType: getValueType(value),
    value,
  });

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendValueOptions({
        options,
        value: item,
        viewId,
        path: `${path}[${index}]`,
      });
    });

    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      appendValueOptions({
        options,
        value: item,
        viewId,
        path: path ? `${path}.${key}` : key,
      });
    });
  }
};

/**
 * Creates the cache key used to deduplicate in-flight view fetches.
 *
 * @param view The resolved view being fetched
 * @returns The cache key for that view request
 */
const getQueryCacheKey = (
  view: Pick<ResolvedView, "id" | "source" | "params">
) =>
  JSON.stringify({
    viewId: view.id,
    source: view.source,
    params: view.params ?? {},
  });

/**
 * Selects the views that should be loaded, preserving the requested order.
 *
 * @param resolvedViews The available resolved views
 * @param viewIds Optional IDs to narrow the selection to
 * @returns The selected views, or null if any requested ID is missing
 */
const selectResolvedViews = ({
  resolvedViews,
  viewIds,
}: {
  resolvedViews: ResolvedView[];
  viewIds?: string[];
}) => {
  if (!viewIds) {
    return resolvedViews;
  }

  const selectedViews: ResolvedView[] = [];
  const resolvedViewsById = new Map(
    resolvedViews.map((view) => [view.id, view] as const)
  );

  for (const viewId of Array.from(new Set(viewIds))) {
    const view = resolvedViewsById.get(viewId);

    if (!view) {
      return null;
    }

    selectedViews.push(view);
  }

  return selectedViews;
};

/**
 * Applies direct field bindings from loaded view data onto node props.
 *
 * @param props The current node props
 * @param readOnly The existing read-only map
 * @param bindings The field bindings to apply
 * @param viewsById The loaded view data keyed by view ID
 * @param fields The component fields for the node being updated, used to determine nested field types
 * @returns The updated props and read-only map
 */
const applyViewBindings = ({
  props,
  readOnly,
  bindings,
  viewsById,
  componentConfig,
  previousBindings,
}: {
  props: Record<string, any>;
  readOnly?: Omit<ComponentData, "type">["readOnly"];
  bindings: NodeViewState["bindings"];
  previousBindings: NodeViewState["bindings"];
  viewsById?: Record<string, any>;
  componentConfig: ComponentConfig;
}) => {
  let nextProps = cloneObject(props);
  const nextReadOnly = { ...(readOnly ?? {}) };

  Object.entries(bindings).forEach(([fieldPath, binding]) => {
    if (!viewsById || !viewsById[binding.viewId]) {
      console.debug("Some views are missing, reusing existing bindings");
      return;
    }

    const fieldPathSegments = getPathSegments(fieldPath);
    const bindingPath = getPathSegments(binding.path);

    assignPathBinding(
      { pathSegments: fieldPathSegments, value: nextProps },
      {
        pathSegments: bindingPath,
        value: { [binding.viewId]: viewsById[binding.viewId] },
      },
      (boundee) => {
        const fieldDef = getFieldAtPath(
          fieldPath,
          componentConfig.fields || {}
        );
        const defaultItemProps =
          fieldDef?.type === "array" ? fieldDef.defaultItemProps ?? {} : {};

        return boundee.value ? { ...boundee.value } : { ...defaultItemProps };
      }
    );

    const fieldPathNoWildcard = fieldPath.endsWith("[*]")
      ? fieldPath.slice(0, -3)
      : fieldPath;

    nextReadOnly[fieldPathNoWildcard] = true;
  });

  // Set previously bound fields to read-only false when their bindings are removed, allowing the UI to edit them again
  Object.keys(previousBindings).forEach((fieldPath) => {
    if (bindings[fieldPath]) return;

    const fieldPathNoWildcard = fieldPath.endsWith("[*]")
      ? fieldPath.slice(0, -3)
      : fieldPath;

    nextReadOnly[fieldPathNoWildcard] = false;
  });

  return {
    props: nextProps,
    readOnly: nextReadOnly,
  };
};

/**
 * Applies template strings from loaded view data onto node props.
 *
 * @param props The current node props
 * @param templates The template strings to resolve
 * @param viewsById The loaded view data keyed by view ID
 * @returns The updated props
 */
const applyViewTemplates = ({
  props,
  templates,
  bindings,
  viewsById,
}: {
  props: Record<string, any>;
  templates: NodeViewState["templates"];
  bindings: NodeViewState["bindings"];
  viewsById?: Record<string, any>;
}) => {
  if (!viewsById) return props;

  let nextProps = cloneObject(props);

  Object.entries(templates).forEach(([fieldPath, template]) => {
    const expressionsToAssign = getTemplateExpressions(template);
    const templateFieldPath = getTemplateStorageKey({
      fieldPath,
      template,
      bindings,
    });

    if (
      !isValidTemplateForFieldPath({
        fieldPath: templateFieldPath,
        template,
        bindings,
      })
    ) {
      console.debug(`Invalid template for field path: ${templateFieldPath}`);
      return;
    }

    try {
      expressionsToAssign.forEach((expression) => {
        if (!isValidPathExpression(expression)) {
          console.debug(`Invalid path expression: ${expression}`);
          return;
        }

        assignPathBinding(
          {
            pathSegments: getPathSegments(templateFieldPath),
            value: nextProps,
          },
          { pathSegments: getPathSegments(expression), value: viewsById },
          (boundee) => boundee.value,
          (boundee, boundValue) => {
            const currentTemplate =
              typeof boundee.value === "string" &&
              isTemplateString(boundee.value)
                ? boundee.value
                : template;

            const nextTemplate = replaceTemplateExpressionValue({
              template: currentTemplate,
              expression: getPathString(boundValue.pathSegments),
              value: boundValue.value,
            });

            return nextTemplate;
          }
        );
      });
    } catch (e) {
      console.warn(
        `Failed to apply template for field path: ${templateFieldPath}`,
        e
      );
    }
  });

  return nextProps;
};

/**
 * Increments usage counts for every view referenced by a node.
 *
 * @param counts The counts accumulator
 * @param nodeState The node view state to inspect
 * @returns Nothing
 */
const addReferencedViewCounts = (
  counts: Record<string, number>,
  nodeState: NodeViewState
) => {
  forEachReferencedViewId(nodeState, (viewId) => {
    counts[viewId] = (counts[viewId] || 0) + 1;
  });
};

/**
 * Clears the in-memory cache of in-flight view fetches.
 *
 * @returns Nothing
 */
export const clearQueryCache = () => {
  inFlightQueries.clear();
};

/**
 * Normalizes root data into the shape expected by the runtime helpers.
 *
 * @param root The raw root data
 * @returns A normalized root data object
 */
export const normalizeRootData = (root?: RootData | null) => {
  if (!root) {
    return {
      props: {},
      readOnly: undefined,
    };
  }

  if ("props" in root && root.props) {
    return {
      props: root.props,
      readOnly: root.readOnly,
    };
  }

  return {
    props: root as Record<string, any>,
    readOnly: undefined,
  };
};

/**
 * Converts root data into a root component shape when needed.
 *
 * @param root The raw root data or root component
 * @returns A root component, or null when no root exists
 */
export const toRootComponent = (
  root?: RootData | ComponentData | null
): ComponentData | null => {
  if (!root) {
    return null;
  }

  if ("type" in root) {
    return root;
  }

  const normalized = normalizeRootData(root);

  return {
    type: "root",
    props: {
      id: "root",
      ...normalized.props,
    },
    readOnly: normalized.readOnly,
  };
};

/**
 * Reads the persisted custom views stored on the root node.
 *
 * @param options The root data and optional storage key
 * @returns The normalized views storage
 */
export const getViewsStorage = ({
  root,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  root?: RootData | ComponentData | null;
  storageKey?: string;
}): ViewsStorage => {
  const rootComponent = toRootComponent(root);
  const raw = rootComponent?.props?.[storageKey];

  if (!raw || typeof raw !== "object") {
    return { custom: [] };
  }

  return {
    custom: Array.isArray((raw as ViewsStorage).custom)
      ? (raw as ViewsStorage).custom.map((item) => ({
          id: item.id,
          label: item.label,
          source: item.source,
          params:
            item.params && typeof item.params === "object" ? item.params : {},
        }))
      : [],
  };
};

/**
 * Reads the template and binding state stored on a node's props.
 *
 * @param options The props to inspect and optional node state key
 * @returns The normalized node view state
 */
export const getNodeViewState = ({
  props,
  nodeStateKey = DEFAULT_NODE_STATE_KEY,
}: {
  props?: Record<string, any>;
  nodeStateKey?: string;
}): NodeViewState => {
  const raw = props?.[nodeStateKey];

  if (!raw || typeof raw !== "object") {
    return {
      templates: {},
      bindings: {},
    };
  }

  return {
    templates:
      raw.templates && typeof raw.templates === "object" ? raw.templates : {},
    bindings:
      raw.bindings && typeof raw.bindings === "object" ? raw.bindings : {},
  };
};

/**
 * Stores node view state back onto props, removing the key when empty.
 *
 * @param options The props, node state, and optional state key
 * @returns The updated props object
 */
export const setNodeViewState = ({
  props,
  nodeState,
  nodeStateKey = DEFAULT_NODE_STATE_KEY,
}: {
  props: Record<string, any>;
  nodeState: NodeViewState;
  nodeStateKey?: string;
}) => {
  const nextProps = { ...props };
  const hasTemplates = Object.keys(nodeState.templates).length > 0;
  const hasBindings = Object.keys(nodeState.bindings).length > 0;

  if (!hasTemplates && !hasBindings) {
    delete nextProps[nodeStateKey];

    return nextProps;
  }

  nextProps[nodeStateKey] = nodeState;

  return nextProps;
};

/**
 * Writes custom view storage back onto the root node.
 *
 * @param options The root data, storage key, and next storage value
 * @returns The updated root data
 */
export const updateStorageInRoot = ({
  root,
  storageKey = DEFAULT_STORAGE_KEY,
  storage,
}: {
  root: RootData;
  storageKey?: string;
  storage: ViewsStorage;
}) => {
  const normalized = normalizeRootData(root);

  return {
    ...root,
    props: {
      ...normalized.props,
      [storageKey]: storage,
    },
  };
};

/**
 * Merges built-in and stored custom views into one runtime list.
 *
 * @param options The root data, built-in views, and optional storage key
 * @returns The resolved views
 */
export const getResolvedViews = ({
  root,
  builtInViews = [],
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  root?: RootData | ComponentData | null;
  builtInViews?: BuiltInView[];
  storageKey?: string;
}): ResolvedView[] => {
  const storage = getViewsStorage({ root, storageKey });

  return [
    ...builtInViews.map((view) => ({
      id: view.id,
      label: view.label,
      source: view.source,
      params: view.params ?? {},
      builtIn: true,
    })),
    ...storage.custom.map((view) => ({
      ...view,
      params: view.params ?? {},
    })),
  ];
};

/**
 * Returns the key under which a template should be stored in the templates object.
 *
 * @param fieldPath The static field path the template is attached to
 * @param template The template string
 * @param bindings The node's current view-state bindings
 * @returns The storage key for the template
 */
export const getTemplateStorageKey = ({
  fieldPath,
  template,
  bindings,
}: {
  fieldPath: string;
  template: string;
  bindings: NodeViewState["bindings"];
}) =>
  getWildcardTemplateExpressions(template).length > 0
    ? getWildcardFieldPath({ fieldPath, bindings })
    : fieldPath;

/**
 * Resolves the array-binding context for a given field path.
 *
 * @param fieldPath The field path to look up
 * @param bindings The node's current view-state bindings
 * @returns The binding context, or null if no wildcard ancestor binding exists
 */
const getTemplateBindingContext = ({
  fieldPath,
  bindings,
}: {
  fieldPath: string;
  bindings: NodeViewState["bindings"];
}) => {
  const bindingKey = getPathToClosestWildcard(fieldPath, Object.keys(bindings));

  if (!bindingKey || !bindings[bindingKey]) {
    return null;
  }

  return {
    bindingKey,
    binding: bindings[bindingKey],
    wildcardCount: getWildcardCount(bindings[bindingKey].path),
    matchRegExp: getWildcardPathRegExp(bindings[bindingKey].path),
  };
};

/**
 * Checks whether all wildcard expressions in a template are valid for the closest array binding of the given field path.
 *
 * A template is valid if it has no wildcard expressions, or if every wildcard expression matches the closest array binding.
 *
 * @param fieldPath The field path the template is attached to
 * @param template The template string to validate
 * @param bindings The node's current view-state bindings
 * @returns Whether the template is valid for the field path
 */
export const isValidTemplateForFieldPath = ({
  fieldPath,
  template,
  bindings,
}: {
  fieldPath: string;
  template: string;
  bindings: NodeViewState["bindings"];
}) => {
  const wildcardExpressions = getWildcardTemplateExpressions(template);

  if (wildcardExpressions.length === 0) {
    return true;
  }

  const context = getTemplateBindingContext({
    fieldPath,
    bindings,
  });

  if (!context) {
    return false;
  }

  return wildcardExpressions.every(
    (expression) =>
      getWildcardCount(expression) === context.wildcardCount &&
      context.matchRegExp.test(expression)
  );
};

/**
 * Enumerates every reachable value inside loaded view data for the UI.
 *
 * @param options The loaded view data keyed by view ID
 * @returns The flattened view value options
 */
export const getViewValueOptions = ({
  viewsById,
}: {
  viewsById: Record<string, any>;
}) => {
  const options: ViewValueOption[] = [];

  Object.entries(viewsById).forEach(([viewId, value]) => {
    appendValueOptions({
      options,
      viewId,
      value,
      path: viewId,
    });
  });

  return options;
};

/**
 * Checks whether a view value option can bind to a given field type.
 *
 * @param options The field and candidate option to compare
 * @returns Whether the binding is compatible
 */
export const isCompatibleFieldBinding = ({
  field,
  option,
}: {
  field: Pick<Field, "type"> & Pick<Partial<SelectField>, "options">;
  option: ViewValueOption;
}) => {
  switch (field.type) {
    case "number":
      return option.valueType === "number" || !isNaN(Number(option.value));
    case "array":
      return option.valueType === "array" && isPlainObject(option.value[0]);
    case "text":
    case "textarea":
      return ["string", "number", "boolean", "null"].includes(option.valueType);
    case "richtext":
      return option.valueType === "string";
    case "select":
    case "radio":
      if (!field.options) return false;

      const typeCompatible = ["string", "number", "boolean", "null"].includes(
        option.valueType
      );

      if (!typeCompatible) return false;

      // Options need a matching field option to map to
      return field.options.some((opt) => opt.value === option.value);
    default:
      return false;
  }
};

/**
 * Finds the currently open template fragment up to the cursor position
 *
 * @param options The current input value and cursor position
 * @returns The active template fragment, or null when none is open
 */
export const getTemplateFragment = ({
  value,
  cursor,
}: {
  value: string;
  cursor?: number;
}) => {
  const beforeCursor = value.slice(0, cursor ?? value.length);
  const openIndex = beforeCursor.lastIndexOf("{{");

  if (openIndex === -1) {
    return null;
  }

  const closeIndex = beforeCursor.lastIndexOf("}}");

  if (closeIndex > openIndex) {
    return null;
  }

  return {
    start: openIndex,
    query: beforeCursor.slice(openIndex + 2).trim(),
  };
};

/**
 * Completes and closes the open template fragment with an expression, and moves the cursor to the end of the inserted expression.
 *
 * @param options The current input value, cursor, and selected expression
 * @returns The updated value and next cursor position
 */
export const insertTemplateExpression = ({
  value,
  cursor,
  expression,
}: {
  value: string;
  cursor?: number;
  expression: string;
}) => {
  const fragment = getTemplateFragment({ value, cursor });

  if (!fragment) {
    return {
      value,
      cursor,
    };
  }

  const nextValue = `${value.slice(0, fragment.start)}{{ ${expression} }}${
    cursor ? value.slice(cursor) : ""
  }`;

  return {
    value: nextValue,
    cursor: fragment.start + expression.length + 6,
  };
};

/**
 * Fetches data for a resolved view, deduplicating concurrent requests.
 *
 * @param options The resolved view, sources, metadata, and root context
 * @returns The fetched view data
 */
export const queryResolvedView = async ({
  view,
  sources,
  metadata,
  root,
}: {
  view: Pick<ResolvedView, "id" | "source" | "params">;
  sources: ViewSources;
  metadata?: Metadata;
  root: ComponentData | null;
}) => {
  const source = sources[view.source];

  if (!source) {
    throw new Error(`View source "${view.source}" does not exist`);
  }

  const key = getQueryCacheKey(view);

  if (!inFlightQueries.has(key)) {
    const request = Promise.resolve(
      source.fetch(view.params ?? {}, {
        metadata,
        root,
        viewId: view.id,
      })
    ).finally(() => {
      inFlightQueries.delete(key);
    });

    inFlightQueries.set(key, request);
  }

  return inFlightQueries.get(key)!;
};

/**
 * Loads resolved view data for all views or a requested subset.
 *
 * @param options The root, metadata, runtime options, and optional view IDs
 * @returns The loaded view data keyed by view ID, or null if a view is missing
 */
export const loadResolvedViewData = async ({
  root,
  metadata,
  options,
  viewIds,
}: {
  root?: RootData | ComponentData | null;
  metadata?: Metadata;
  options: Pick<ViewsPluginOptions, "builtInViews" | "sources" | "storageKey">;
  viewIds?: string[];
}): Promise<Record<string, any> | null> => {
  const rootComponent = toRootComponent(root);
  const resolvedViews = getResolvedViews({
    root: rootComponent,
    builtInViews: options.builtInViews,
    storageKey: options.storageKey,
  });
  const selectedViews = selectResolvedViews({
    resolvedViews,
    viewIds,
  });

  if (!selectedViews) {
    return null;
  }

  const viewEntries = await Promise.all(
    selectedViews.map(
      async (view) =>
        [
          view.id,
          await queryResolvedView({
            view,
            sources: options.sources,
            metadata,
            root: rootComponent,
          }),
        ] as const
    )
  );

  return Object.fromEntries(viewEntries);
};

/**
 * Applies bindings and template strings to a node using loaded view data.
 *
 * @param options The node data, root data, metadata, view options, and config
 * @returns The updated node data
 */
export const applyNodeViews = async ({
  data,
  previousData,
  metadata,
  root,
  options,
  componentConfig,
}: {
  data: Omit<ComponentData, "type">;
  previousData?: Omit<ComponentData, "type"> | null;
  metadata?: Metadata;
  root: ComponentData | null;
  options: ViewsPluginOptions;
  componentConfig: ComponentConfig;
}) => {
  const nodeState = getNodeViewState({
    props: data.props,
    nodeStateKey: options.nodeStateKey,
  });
  const previousNodeState = previousData
    ? getNodeViewState({
        props: previousData.props,
        nodeStateKey: options.nodeStateKey,
      })
    : { templates: {}, bindings: {} };

  // Clear any removed view references from templates and bindings
  // (e.g. array field items that were deleted)
  if (nodeState.bindings) {
    Object.entries(nodeState.bindings).forEach(([key, _binding]) => {
      const dataForBinding = getValueAtPath(data.props, key);

      if (typeof dataForBinding === "undefined") {
        delete nodeState.bindings[key];
      }
    });
  }
  if (nodeState.templates) {
    Object.entries(nodeState.templates).forEach(([key, _template]) => {
      const dataForTemplate = getValueAtPath(data.props, key);

      if (typeof dataForTemplate === "undefined") {
        delete nodeState.templates[key];
      }
    });
  }

  const referencedViewIds = getReferencedViewIds(nodeState);

  try {
    const viewsById = await loadResolvedViewData({
      root,
      metadata,
      options,
      viewIds: referencedViewIds,
    });

    const boundData = applyViewBindings({
      props: data.props,
      readOnly: data.readOnly,
      bindings: nodeState.bindings,
      viewsById: viewsById || undefined,
      componentConfig,
      previousBindings: previousNodeState.bindings,
    });

    const nextProps = applyViewTemplates({
      props: boundData.props,
      templates: nodeState.templates,
      bindings: nodeState.bindings,
      viewsById: viewsById || undefined,
    });

    return {
      ...data,
      props: nextProps,
      readOnly: boundData.readOnly,
    };
  } catch (e) {
    console.warn("Error loading view data, skipping view application", e);
    return data;
  }
};

/**
 * Counts how many times each view is referenced across the current document.
 *
 * @param options The document data, config, and optional node state key
 * @returns The usage counts keyed by view ID
 */
export const collectViewUsageCounts = ({
  data,
  config,
  nodeStateKey = DEFAULT_NODE_STATE_KEY,
}: {
  data: Data;
  config: Config;
  nodeStateKey?: string;
}) => {
  const counts: Record<string, number> = {};
  const countProps = (props?: Record<string, any>) => {
    addReferencedViewCounts(counts, getNodeViewState({ props, nodeStateKey }));
  };

  countProps(normalizeRootData(data.root).props);
  walkTree(data, config, (content) => {
    content.forEach((item) => {
      countProps(item.props);
    });

    return content;
  });

  return counts;
};

/**
 * Collects the IDs of every content node in the current document.
 *
 * @param options The document data and config
 * @returns The collected node IDs
 */
export const collectNodeIds = ({
  data,
  config,
}: {
  data: Data;
  config: Config;
}) => {
  const ids = new Set<string>();

  walkTree(data, config, (content) => {
    content.forEach((item) => {
      ids.add(item.props.id);
    });

    return content;
  });

  return Array.from(ids);
};
