import { ZoneIndex } from "../../types/Internal";

export const findZonesForArea = (
  state: { indexes: { zones: ZoneIndex } },
  area: string
) => {
  return Object.keys(state.indexes.zones).filter(
    (zone) => zone.split(":")[0] === area
  );
};
