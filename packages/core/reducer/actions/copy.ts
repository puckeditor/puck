import { Data } from "../../types";
import { CopyAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { getItem } from "../../lib/data/get-item";
import { AppStore } from "../../store";
import { useClipboardStore } from "../../lib/clipboard-store";

export function copyAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: CopyAction,
  appStore: AppStore
): PrivateAppState<UserData> {
  const item = getItem(
    { index: action.sourceIndex, zone: action.sourceZone },
    state
  );

  if (item) {
    useClipboardStore.getState().copy(item);
  }

  // Copy action doesn't modify the state, just stores to clipboard
  return state;
}
