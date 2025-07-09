import { Data } from "../../types";
import { rootDroppableId } from "../root-droppable-id";

// Force 'zones' to always be present and non-undefined
type WithZones<T extends Data> = T & { zones: NonNullable<T["zones"]> };

export const setupZone = <UserData extends Data>(
  data: UserData,
  zoneKey: string
): Required<WithZones<UserData>> => {
  if (zoneKey === rootDroppableId) {
    return data as Required<WithZones<UserData>>;
  }

  // Preprocess to ensure zones is not undefined
  const newData = {
    ...data,
    zones: data.zones ? { ...data.zones } : {},
  };

  newData.zones[zoneKey] = newData.zones[zoneKey] || [];

  return newData as Required<WithZones<UserData>>;
};
