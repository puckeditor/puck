import { Data, Config, walkTree, Field, SelectField } from "@puckeditor/core";

import { NodeViewState, ViewValueOption } from "../../types";

import { DEFAULT_NODE_STATE_KEY } from "../constants";
import { getFirstSegmentName } from "../strings/paths";
import { getTemplateExpressions } from "../strings/templates";
import { normalizeRootData } from "../puck/normalize-root-data";
import { isPlainObject } from "../utils/is-plain-object";

/**
 * Sets the component templates, bindings, and sync state in the props.
 *
 * @param options The props, node state, and the key where the node state is stored on the props
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
  const hasSynced = Object.keys(nodeState.synced).length > 0;

  if (!hasTemplates && !hasBindings && !hasSynced) {
    delete nextProps[nodeStateKey];

    return nextProps;
  }

  nextProps[nodeStateKey] = {
    templates: nodeState.templates,
    bindings: nodeState.bindings,
    ...(hasSynced ? { synced: nodeState.synced } : {}),
  };

  return nextProps;
};

/**
 * Reads the template, binding, and sync state stored on a component's props.
 *
 * @param options The components props and the key where the node state is stored on the props
 * @returns The component templates and bindings state
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
      synced: {},
    };
  }

  return {
    templates:
      raw.templates && typeof raw.templates === "object" ? raw.templates : {},
    bindings:
      raw.bindings && typeof raw.bindings === "object" ? raw.bindings : {},
    synced: raw.synced && typeof raw.synced === "object" ? raw.synced : {},
  };
};

/**
 * Gets the unique view IDs referenced in a component's templates or bindings.
 *
 * @param nodeState The component templates or bindings state from which to extract the referenced view IDs
 * @returns The referenced view IDs
 */
export const getReferencedViewIds = (nodeState: NodeViewState) => {
  const ids = new Set<string>();

  forEachReferencedViewId(nodeState, (viewId) => {
    ids.add(viewId);
  });

  return Array.from(ids);
};

/**
 * Counts how many times each view is referenced across the current puck data.
 *
 * @param options The data payload, puck config, and the node state key for accessing the view state on each component
 * @returns The usage counts keyed by view ID
 */
export const countViewUsage = ({
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
    forEachReferencedViewId(
      getNodeViewState({ props, nodeStateKey }),
      (viewId) => {
        counts[viewId] = (counts[viewId] || 0) + 1;
      }
    );
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
 * Iterates over every view ID referenced by a component's bindings and templates.
 *
 * @param nodeState The component templates or bindings state to inspect
 * @param callback The callback to invoke for each referenced view ID
 */
export const forEachReferencedViewId = (
  nodeState: NodeViewState,
  callback: (viewId: string) => void
) => {
  Object.values(nodeState.bindings).forEach((binding) => {
    callback(binding.viewId);
  });

  Object.values(nodeState.templates).forEach((template) => {
    getTemplateExpressions(template).forEach((expression) => {
      const viewId = getFirstSegmentName(expression);

      if (viewId) {
        callback(viewId);
      }
    });
  });
};
