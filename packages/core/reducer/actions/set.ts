import { Data } from "../../types";
import { SetAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";

export const setAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: SetAction<UserData>,
  appStore: AppStore
): PrivateAppState<UserData> => {
  if (typeof action.state === "object") {
    const newState = {
      ...state,
      ...action.state,
    };

    if (action.state.indexes) {
      return newState;
    }

    console.warn(
      "`set` is expensive and may cause unnecessary re-renders. Consider using a more atomic action instead."
    );

    return walkAppState(newState, appStore.config);
  }

  return { ...state, ...action.state(state) };
};
