import { Config, ComponentData } from "../../types";
import { PuckNodeData } from "../../types/Internal";

/**
 * Resolves the display label for a component instance.
 *
 * Priority:
 * 1. `__puck.label` — user-set custom label on the instance
 * 2. `config.components[type].label` — developer-defined label for the component type
 * 3. `type.toString()` — raw component type string as fallback
 */
export const getComponentLabel = (
  item: Pick<ComponentData, "__puck" | "type">,
  config: Config,
  fallback?: string
): string => {
  const type = item.type.toString();
  return (
    item.__puck?.label ?? config.components[type]?.label ?? type ?? fallback
  );
};

/**
 * Same as getComponentLabel but accepts a node from the store index
 * (where data is the ComponentData).
 */
export const getNodeLabel = (
  node: PuckNodeData,
  config: Config,
  fallback?: string
): string => {
  if (!node.data) return fallback ?? "Component";
  return getComponentLabel(node.data, config, fallback);
};
