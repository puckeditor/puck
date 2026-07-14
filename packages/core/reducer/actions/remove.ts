import { Data } from "../../types";
import { remove } from "../../lib/data/remove";
import { getItem } from "../../lib/data/get-item";
import { RemoveAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";

export const removeAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: RemoveAction,
  appStore: AppStore
) => {
  const item = getItem({ index: action.index, zone: action.zone }, state)!;

  const nodesToDelete = new Set<string>([item.props.id]);

  // Gather related
  Object.entries(state.indexes.nodes).forEach(([nodeId, nodeData]) => {
    const pathIds = nodeData.path.map((p) => p.split(":")[0]);
    if (pathIds.includes(item.props.id)) {
      nodesToDelete.add(nodeId);
    }
  });

  const newState = walkAppState<UserData>(
    state,
    appStore.config,
    (content, zoneCompound) => {
      if (zoneCompound === action.zone) {
        return remove(content, action.index);
      }

      return content;
    }
  );

  Object.keys(newState.data.zones || {}).forEach((zoneCompound) => {
    const parentId = zoneCompound.split(":")[0];

    if (nodesToDelete.has(parentId) && newState.data.zones) {
      delete newState.data.zones[zoneCompound];
    }
  });

  Object.keys(newState.indexes.zones).forEach((zoneCompound) => {
    const parentId = zoneCompound.split(":")[0];

    if (nodesToDelete.has(parentId)) {
      delete newState.indexes.zones[zoneCompound];
    }
  });

  const newItemExpanded = { ...newState.ui.itemExpanded };

  nodesToDelete.forEach((id) => {
    delete newState.indexes.nodes[id];
    delete newItemExpanded[id];
  });

  newState.ui = { ...newState.ui, itemExpanded: newItemExpanded };

  return newState;
};
