import { PrivateAppState } from "../../types/Internal";

export const findZonesForArea = (state: PrivateAppState, area: string) => {
  return Object.keys(state.indexes.zones).filter(
    (zone) => zone.split(":")[0] === area
  );
};
