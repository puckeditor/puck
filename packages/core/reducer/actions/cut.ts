import { Data } from "../../types";
import { CutAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { getItem } from "../../lib/data/get-item";
import { AppStore } from "../../store";
import { useClipboardStore } from "../../lib/clipboard-store";
import { removeAction } from "./remove";

export function cutAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: CutAction,
  appStore: AppStore
): PrivateAppState<UserData> {
  const item = getItem(
    { index: action.sourceIndex, zone: action.sourceZone },
    state
  );

  if (item) {
    // First copy the item to clipboard
    useClipboardStore.getState().copy(item);
    
    // Then remove it from the state
    return removeAction(state, {
      type: "remove",
      index: action.sourceIndex,
      zone: action.sourceZone,
    }, appStore);
  }

  return state;
}
