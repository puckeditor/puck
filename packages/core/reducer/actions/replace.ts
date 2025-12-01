import { ComponentDataOptionalId, Data } from "../../types";
import { ReplaceAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";
import { getIdsForParent } from "../../lib/data/get-ids-for-parent";
import { walkTree } from "../../lib/data/walk-tree";
import { generateId } from "../../lib/generate-id";

export const replaceAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: ReplaceAction<UserData>,
  appStore: AppStore
): PrivateAppState<UserData> => {
  const [parentId] = action.destinationZone.split(":");
  const idsInPath = getIdsForParent(action.destinationZone, state);

  const originalId =
    state.indexes.zones[action.destinationZone].contentIds[
      action.destinationIndex
    ];

  const idChanged = originalId !== action.data.props.id;

  if (idChanged) {
    throw new Error(
      'Can\'t change the id during a replace action. Please us "remove" and "insert" to define a new node.'
    );
  }

  const newSlotIds: string[] = [];

  // Populate ids and collect nested slot IDs
  // We use explicit function here so we don't need to walk tree twice
  const data = walkTree(action.data, appStore.config, (contents, opts) => {
    newSlotIds.push(`${opts.parentId}:${opts.propName}`);

    return contents.map((item: ComponentDataOptionalId) => {
      const id = generateId(item.type);

      return {
        ...item,
        props: { id, ...item.props },
      };
    });
  });

  const stateWithDeepSlotsRemoved = {
    ...state,
    ui: { ...state.ui, ...action.ui },
  };

  Object.keys(state.indexes.zones).forEach((zoneCompound) => {
    const id = zoneCompound.split(":")[0];

    if (id === originalId) {
      if (!newSlotIds.includes(zoneCompound)) {
        delete stateWithDeepSlotsRemoved.indexes.zones[zoneCompound];
      }
    }
  });

  return walkAppState<UserData>(
    stateWithDeepSlotsRemoved,
    appStore.config,
    (content, zoneCompound) => {
      const newContent = [...content];

      if (zoneCompound === action.destinationZone) {
        newContent[action.destinationIndex] = data;
      }

      return newContent;
    },
    (childItem, path) => {
      const pathIds = path.map((p) => p.split(":")[0]);

      if (childItem.props.id === data.props.id) {
        return data;
      } else if (childItem.props.id === parentId) {
        return childItem;
      } else if (idsInPath.indexOf(childItem.props.id) > -1) {
        // Node is parent of target
        return childItem;
      } else if (pathIds.indexOf(data.props.id) > -1) {
        // Node is child target
        return childItem;
      }

      return null;
    }
  );
};
