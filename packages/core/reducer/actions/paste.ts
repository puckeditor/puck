import { Data } from "../../types";
import { generateId } from "../../lib/generate-id";
import { PasteAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";
import { getIdsForParent } from "../../lib/data/get-ids-for-parent";
import { getItem } from "../../lib/data/get-item";
import { AppStore } from "../../store";
import { insert } from "../../lib/data/insert";
import { useClipboardStore } from "../../lib/clipboard-store";

export function pasteAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: PasteAction,
  appStore: AppStore
): PrivateAppState<UserData> {
  const clipboardData = useClipboardStore.getState().clipboardData;
  
  if (!clipboardData.component) {
    return state;
  }

  const item = clipboardData.component;
  const idsInPath = getIdsForParent(action.destinationZone, state);

  const newItem = {
    ...item,
    props: {
      ...item.props,
      id: generateId(item.type),
    },
  };

  const modified = walkAppState<UserData>(
    state,
    appStore.config,
    (content, zoneCompound) => {
      if (zoneCompound === action.destinationZone) {
        return insert(content, action.destinationIndex, newItem);
      }

      return content;
    },
    (childItem, path, index) => {
      const zoneCompound = path[path.length - 1];
      const parents = path.map((p) => p.split(":")[0]);

      if (parents.indexOf(newItem.props.id) > -1) {
        return {
          ...childItem,
          props: {
            ...childItem.props,
            id: generateId(childItem.type),
          },
        };
      }

      if (
        zoneCompound === action.destinationZone &&
        index === action.destinationIndex
      ) {
        return newItem;
      }

      const [destinationZoneParent] = action.destinationZone.split(":");

      if (
        destinationZoneParent === childItem.props.id ||
        idsInPath.indexOf(childItem.props.id) > -1
      ) {
        return childItem;
      }

      return null;
    }
  );

  return {
    ...modified,
    ui: {
      ...modified.ui,
      itemSelector: {
        index: action.destinationIndex,
        zone: action.destinationZone,
      },
    },
  };
}
