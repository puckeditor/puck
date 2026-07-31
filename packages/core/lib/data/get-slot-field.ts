import { Config } from "../../types";
import { NodeIndex } from "../../types/Internal";
import { rootAreaId } from "../root-droppable-id";
import { getFieldByPath } from "./get-field-by-path";

/**
 * Gets the field definition backing a slot zone compound, using the
 * parent's component config (or the root config for root slots).
 */
export const getSlotField = (
  zoneCompound: string,
  config: Config,
  nodes: NodeIndex
) => {
  const [componentId, slotId] = zoneCompound.split(":");

  if (!slotId) {
    return;
  }

  const componentType = nodes[componentId]?.data.type;

  const configForComponent =
    componentType && componentType !== rootAreaId
      ? config.components[componentType]
      : config.root;

  const slotField = getFieldByPath(slotId, configForComponent?.fields);

  return slotField;
};
