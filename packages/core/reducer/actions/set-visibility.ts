import { Data } from "../../types";
import { SetVisibilityAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";

/**
 * Sets the `hidden` flag on a component, making it invisible in renders
 * while keeping it in the document structure.
 *
 * The `hidden` property lives on `BaseData` (same level as `readOnly`), so it
 * persists through save/load cycles automatically.
 */
export function setVisibilityAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: SetVisibilityAction,
  appStore: AppStore
): PrivateAppState<UserData> {
  const { id, hidden } = action;

  return walkAppState<UserData>(
    state,
    appStore.config,
    (content) => {
      return content.map((item) => {
        if (item.props.id === id) {
          // Immutable update: spread existing item and set hidden
          return { ...item, hidden };
        }
        return item;
      });
    }
  );
}
