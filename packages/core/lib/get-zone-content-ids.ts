import { Data, DefaultComponents } from "../types";
import { PrivateAppState } from "../types/Internal";

export const getZoneContentIds = (zoneCompound: string, state: PrivateAppState<Data<DefaultComponents, any>>) => {
  if (!zoneCompound) {
    return [];
  }

  return state.indexes.zones[zoneCompound].contentIds;
};
