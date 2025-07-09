import { ComponentData, Config, RootData } from "../../types";
import { mapSlots } from "./map-slots";

export const stripSlots = (
  data: ComponentData | RootData,
  config: Config
): ComponentData | RootData => {
  // Strip out slots to prevent re-renders of parents when child changes
  return mapSlots(data, () => null, config);
};
