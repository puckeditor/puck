import { PrivateAppState } from "../types/Internal";

export const getSelectorForId = (state: PrivateAppState, id: string) => {
  const node = state.indexes.nodes[id];

  if (!node) return;

  const zoneCompound = `${node.parentId}:${node.zone}`;

  const index = state.indexes.zones[zoneCompound].contentIds.indexOf(id);

  return { zone: zoneCompound, index };
};
