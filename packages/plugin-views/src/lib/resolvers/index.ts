import { ComponentData, Metadata, ComponentConfig } from "@puckeditor/core";

import type { NodeViewState, ViewsPluginOptions } from "../../types";

import { getViewDataByIds } from "../services/views";
import {
  getPathSegments,
  getPathString,
  getValueAtPath,
  isValidPathExpression,
} from "../strings/paths";
import {
  getTemplateExpressions,
  isTemplateString,
  replaceTemplateExpressionValue,
} from "../strings/templates";
import cloneObject from "../utils/clone-object";

import assignPathBinding from "../assign-path-binding";
import {
  getNodeViewState,
  getReferencedViewIds,
  setNodeViewState,
} from "../bindings";
import {
  areConcreteSyncFieldEntriesEqual,
  createManualSyncState,
  getConcreteSyncFieldEntries,
  isManualSyncState,
  isValidSyncFieldPath,
  setSyncedFieldValue,
} from "../bindings/sync";
import { getTemplateStorageKey, isValidTemplateForFieldPath } from "../views";
import { getFieldAtPath } from "../puck/get-field-from-path";

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
 * Applies explicitly synced field values after bindings and templates resolve.
 *
 * Bindings and wildcard templates already handle their own value sharing,
 * so this pass only handles the remaining manually synced fields.
 */
const applySyncedFields = ({
  props,
  synced,
  bindings,
  templates,
}: {
  props: Record<string, any>;
  synced: NodeViewState["synced"];
  bindings: NodeViewState["bindings"];
  templates: NodeViewState["templates"];
}) => {
  let nextProps = props;
  let nextSynced = { ...synced };

  Object.entries(synced).forEach(([fieldPath, syncState]) => {
    if (
      bindings[fieldPath] ||
      templates[fieldPath] ||
      !isManualSyncState(syncState)
    ) {
      return;
    }

    const currentEntries = getConcreteSyncFieldEntries({
      fieldPath,
      props: nextProps,
    });

    if (currentEntries.length === 0) {
      return;
    }

    if (areConcreteSyncFieldEntriesEqual(currentEntries)) {
      const sharedValue = currentEntries[0]?.value;

      if (!Object.is(syncState.value, sharedValue)) {
        nextSynced[fieldPath] = createManualSyncState(sharedValue);
      }

      return;
    }

    const sourceEntry =
      currentEntries.find(({ value }) => !Object.is(value, syncState.value)) ??
      currentEntries.find(({ value }) => typeof value !== "undefined") ??
      currentEntries[0];

    nextProps = setSyncedFieldValue({
      props: nextProps,
      fieldPath,
      value: sourceEntry.value,
    });

    nextSynced[fieldPath] = createManualSyncState(sourceEntry.value);
  });

  return {
    props: nextProps,
    synced: nextSynced,
  };
};

/**
 * Applies the latest view data to the bindings, templates, and synced fields assigned to the component data.
 *
 * @param options The component data, root data, puck metadata, plugin options, and component config that was used for the provided data
 * @returns The updated component data
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
    : { templates: {}, bindings: {}, synced: {} };

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
  if (nodeState.synced) {
    Object.keys(nodeState.synced).forEach((key) => {
      const dataForSync = getValueAtPath(data.props, key);

      if (
        typeof dataForSync === "undefined" ||
        !isValidSyncFieldPath({
          fieldPath: key,
          bindings: nodeState.bindings,
        })
      ) {
        delete nodeState.synced[key];
      }
    });
  }

  const referencedViewIds = getReferencedViewIds(nodeState);

  try {
    const viewsById = await getViewDataByIds({
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

    const syncedResult = applySyncedFields({
      props: nextProps,
      synced: nodeState.synced,
      bindings: nodeState.bindings,
      templates: nodeState.templates,
    });

    const propsWithNodeState = setNodeViewState({
      props: syncedResult.props,
      nodeState: {
        ...nodeState,
        synced: syncedResult.synced,
      },
      nodeStateKey: options.nodeStateKey,
    });

    return {
      ...data,
      props: propsWithNodeState,
      readOnly: boundData.readOnly,
    };
  } catch (e) {
    console.warn("Error loading view data, skipping view application", e);
    return data;
  }
};
