import { Data } from "../../types";
import { SetDataAction } from "../actions";
import { AppStore } from "../../store";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";

export const setDataAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: SetDataAction,
  appStore: AppStore
): PrivateAppState<UserData> => {
  if (typeof action.data === "object") {
    console.warn(
      "`setData` is expensive and may cause unnecessary re-renders. Consider using a more atomic action instead."
    );

    return walkAppState(
      {
        ...state,
        data: {
          ...state.data,
          ...action.data,
        },
      },
      appStore.config
    );
  }

  return walkAppState(
    {
      ...state,
      data: {
        ...state.data,
        ...action.data(state.data),
      },
    },
    appStore.config
  );
};
