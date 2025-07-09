import { PrivateAppState } from "../../types/Internal";

export const getIdsForParent = (
  zoneCompound: string,
  state: PrivateAppState
) => {
  const [parentId] = zoneCompound.split(":");
  const node = state.indexes.nodes[parentId];

  return (node?.path || []).map((p) => p.split(":")[0]);
};
