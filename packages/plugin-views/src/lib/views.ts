import type { ComponentData, Config, Data, Field, Metadata, RootData } from "@puckeditor/core";
import { setDeep, walkTree } from "@puckeditor/core";
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

export const DEFAULT_STORAGE_KEY = "__puck_views";
export const DEFAULT_NODE_STATE_KEY = "__puck_view_state";
export const INTERNAL_METADATA_KEY = "__puckViewsInternal";
const TEMPLATE_TOKEN_REGEX = /{{\s*([^{}]+?)\s*}}/g;

const inFlightQueries: Record<string, Promise<any>> = {};

export const clearQueryCache = () => {
  Object.keys(inFlightQueries).forEach((key) => {
    delete inFlightQueries[key];
  });
};

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

export const toRootComponent = (
  root?: RootData | ComponentData | null
): ComponentData | null => {
  if (!root) return null;

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

const getValueType = (value: any): ValueType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "unknown";
  }
};

const formatExpression = (viewId: string, path: string) => {
  if (!path) return viewId;

  return path.startsWith("[") ? `${viewId}${path}` : `${viewId}.${path}`;
};

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

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "view";

export const createViewId = ({
  existingIds,
  label,
  source,
}: {
  existingIds: string[];
  label?: string;
  source?: string;
}) => {
  const base = slugify(label || source || "view");

  if (!existingIds.includes(base)) {
    return base;
  }

  let counter = 2;

  while (existingIds.includes(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
};

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

export const getResolvedView = ({
  viewId,
  root,
  builtInViews = [],
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  viewId: string;
  root?: RootData | ComponentData | null;
  builtInViews?: BuiltInView[];
  storageKey?: string;
}) =>
  getResolvedViews({
    root,
    builtInViews,
    storageKey,
  }).find((view) => view.id === viewId);

export const isTemplateString = (value: unknown) =>
  typeof value === "string" && /{{\s*([^{}]+?)\s*}}/.test(value);

export const extractTemplateExpressions = (value: string) => {
  const expressions: string[] = [];

  value.replace(TEMPLATE_TOKEN_REGEX, (_, expression) => {
    expressions.push(expression.trim());

    return "";
  });

  return expressions;
};

const getViewIdFromExpression = (expression: string) => {
  const trimmed = expression.trim();
  const match = /^([a-zA-Z0-9_-]+)/.exec(trimmed);

  return match?.[1] || null;
};

export const extractViewIdsFromNodeState = (nodeState: NodeViewState) => {
  const ids = new Set<string>();

  Object.values(nodeState.bindings).forEach((binding) => {
    ids.add(binding.viewId);
  });

  Object.values(nodeState.templates).forEach((template) => {
    extractTemplateExpressions(template).forEach((expression) => {
      const viewId = getViewIdFromExpression(expression);

      if (viewId) {
        ids.add(viewId);
      }
    });
  });

  return Array.from(ids);
};

export const getValueAtPath = (value: any, path: string) => {
  if (!path) return value;

  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  const parts = normalized.split(".").filter(Boolean);

  return parts.reduce((acc, part) => {
    if (typeof acc === "undefined" || acc === null) {
      return undefined;
    }

    return acc[part];
  }, value);
};

const resolveTemplateValue = ({
  expression,
  viewsById,
}: {
  expression: string;
  viewsById: Record<string, any>;
}) => {
  const value = getValueAtPath(viewsById, expression);

  if (typeof value === "undefined" || value === null) {
    return "";
  }

  return formatPreview(value);
};

export const applyTemplateString = ({
  template,
  viewsById,
}: {
  template: string;
  viewsById: Record<string, any>;
}) =>
  template.replace(TEMPLATE_TOKEN_REGEX, (_, expression) =>
    resolveTemplateValue({
      expression,
      viewsById,
    })
  );

const collectValueOptions = ({
  value,
  viewId,
  path = "",
  options = [],
}: {
  value: any;
  viewId: string;
  path?: string;
  options?: ViewValueOption[];
}) => {
  const valueType = getValueType(value);
  const option: ViewValueOption = {
    viewId,
    path,
    expression: formatExpression(viewId, path),
    preview: formatPreview(value),
    valueType,
  };

  options.push(option);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectValueOptions({
        value: item,
        viewId,
        path: `${path}[${index}]`,
        options,
      });
    });

    return options;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      collectValueOptions({
        value: item,
        viewId,
        path: path ? `${path}.${key}` : key,
        options,
      });
    });
  }

  return options;
};

export const getViewValueOptions = ({
  viewsById,
}: {
  viewsById: Record<string, any>;
}) =>
  Object.entries(viewsById).flatMap(([viewId, value]) =>
    collectValueOptions({
      viewId,
      value,
    })
  );

export const isCompatibleFieldBinding = ({
  field,
  option,
}: {
  field: Field;
  option: ViewValueOption;
}) => {
  switch (field.type) {
    case "number":
      return option.valueType === "number";
    case "select":
    case "radio":
      return ["string", "number", "boolean", "null"].includes(option.valueType);
    case "array":
      return option.valueType === "array";
    case "text":
    case "textarea":
      return [
        "string",
        "number",
        "boolean",
        "null",
        "object",
        "array",
      ].includes(option.valueType);
    default:
      return false;
  }
};

export const getTemplateFragment = ({
  value,
  cursor,
}: {
  value: string;
  cursor: number;
}) => {
  const beforeCursor = value.slice(0, cursor);
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
    end: cursor,
    query: beforeCursor.slice(openIndex + 2).trim(),
  };
};

export const insertTemplateExpression = ({
  value,
  cursor,
  expression,
}: {
  value: string;
  cursor: number;
  expression: string;
}) => {
  const fragment = getTemplateFragment({ value, cursor });

  if (!fragment) {
    return {
      value,
      cursor,
    };
  }

  const nextValue = `${value.slice(0, fragment.start)}{{ ${expression} }}${value.slice(cursor)}`;
  const nextCursor = fragment.start + expression.length + 6;

  return {
    value: nextValue,
    cursor: nextCursor,
  };
};

export const queryResolvedView = async ({
  view,
  sources,
  metadata,
  root,
}: {
  view: ResolvedView;
  sources: ViewSources;
  metadata?: Metadata;
  root: ComponentData | null;
}) => {
  const source = sources[view.source];

  if (!source) {
    throw new Error(`View source "${view.source}" does not exist`);
  }

  const key = JSON.stringify({
    viewId: view.id,
    source: view.source,
    params: view.params ?? {},
  });

  if (!inFlightQueries[key]) {
    inFlightQueries[key] = Promise.resolve(
      source.fetch(view.params ?? {}, {
        metadata,
        root,
        viewId: view.id,
      })
    ).finally(() => {
      delete inFlightQueries[key];
    });
  }

  return inFlightQueries[key];
};

export const applyNodeViews = async ({
  data,
  metadata,
  root,
  options,
}: {
  data: { props: Record<string, any>; readOnly?: Record<string, boolean> };
  metadata?: Metadata;
  root: ComponentData | null;
  options: ViewsPluginOptions;
}) => {
  const nodeState = getNodeViewState({
    props: data.props,
    nodeStateKey: options.nodeStateKey,
  });
  const referencedViewIds = extractViewIdsFromNodeState(nodeState);

  if (referencedViewIds.length === 0) {
    return data;
  }

  const resolvedViews = getResolvedViews({
    root,
    builtInViews: options.builtInViews,
    storageKey: options.storageKey,
  });
  const viewLookup = resolvedViews.reduce<Record<string, ResolvedView>>(
    (acc, view) => ({
      ...acc,
      [view.id]: view,
    }),
    {}
  );

  const missingView = referencedViewIds.find((viewId) => !viewLookup[viewId]);

  if (missingView) {
    return data;
  }

  try {
    const viewEntries = await Promise.all(
      referencedViewIds.map(async (viewId) => [
        viewId,
        await queryResolvedView({
          view: viewLookup[viewId],
          sources: options.sources,
          metadata,
          root,
        }),
      ])
    );
    const viewsById = Object.fromEntries(viewEntries);
    let nextProps = { ...data.props };
    const nextReadOnly = { ...(data.readOnly ?? {}) };

    Object.entries(nodeState.bindings).forEach(([fieldPath, binding]) => {
      const boundValue = getValueAtPath(viewsById[binding.viewId], binding.path);

      if (typeof boundValue !== "undefined") {
        nextProps = setDeep(nextProps, fieldPath, boundValue);
      }

      nextReadOnly[fieldPath] = true;
    });

    Object.entries(nodeState.templates).forEach(([fieldPath, template]) => {
      nextProps = setDeep(
        nextProps,
        fieldPath,
        applyTemplateString({
          template,
          viewsById,
        })
      );
    });

    return {
      ...data,
      props: nextProps,
      readOnly: nextReadOnly,
    };
  } catch {
    return data;
  }
};

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
    const nodeState = getNodeViewState({ props, nodeStateKey });

    Object.values(nodeState.bindings).forEach((binding) => {
      counts[binding.viewId] = (counts[binding.viewId] || 0) + 1;
    });

    Object.values(nodeState.templates).forEach((template) => {
      extractTemplateExpressions(template).forEach((expression) => {
        const viewId = getViewIdFromExpression(expression);

        if (viewId) {
          counts[viewId] = (counts[viewId] || 0) + 1;
        }
      });
    });
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
