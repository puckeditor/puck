import { ComponentData, Config, RootData } from "../../types";
import { mapFields } from "./map-fields";

export const stripSlots = (
  data: ComponentData | RootData,
  config: Config
): ComponentData | RootData => {
  // Strip out slots to prevent re-renders of parents when child changes
  return mapFields(data, { slot: () => null }, config);
};
