import { PrivateAppState } from "../../types/Internal";
import { rootDroppableId } from "../root-droppable-id";

export function getZoneContentIds(
  zoneCompound: string,
  state: PrivateAppState
): string[] | undefined {
  const zone =
    state.indexes.zones?.[zoneCompound ? zoneCompound : rootDroppableId];

  return zone ? zone.contentIds : undefined;
}
