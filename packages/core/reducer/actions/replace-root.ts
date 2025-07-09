import { Data } from "../../types";
import { ReplaceRootAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";

export const replaceRootAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: ReplaceRootAction<UserData>,
  appStore: AppStore
): PrivateAppState<UserData> => {
  return walkAppState<UserData>(
    state,
    appStore.config,
    (content) => content,
    (childItem) => {
      if (childItem.props.id === "root") {
        return {
          ...childItem,
          props: { ...childItem.props, ...action.root.props },
          readOnly: action.root.readOnly,
        };
      }

      // Everything in inside root, so everything needs re-indexing
      return childItem;
    }
  );
};
