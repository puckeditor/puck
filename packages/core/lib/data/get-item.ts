import { Data } from "../../types";
import { PrivateAppState } from "../../types/Internal";
import { rootDroppableId } from "../root-droppable-id";

export type ItemSelector = {
  index: number;
  zone?: string;
};

export function getItem<UserData extends Data>(
  selector: ItemSelector,
  state: PrivateAppState
): UserData["content"][0] | undefined {
  const zone = state.indexes.zones?.[selector.zone || rootDroppableId];

  return zone
    ? state.indexes.nodes[zone.contentIds[selector.index]]?.data
    : undefined;
}
