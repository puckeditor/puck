import { Reducer } from "react";
import { AppState, Data } from "../types";
import { PuckAction } from "./actions";
import type { OnAction } from "../types";
import { AppStore } from "../store";
import { PrivateAppState } from "../types/Internal";
import { setAction } from "./actions/set";
import { insertAction } from "./actions/insert";
import { replaceAction } from "./actions/replace";
import { replaceRootAction } from "./actions/replace-root";
import { duplicateAction } from "./actions/duplicate";
import { reorderAction } from "./actions/reorder";
import { moveAction } from "./actions/move";
import { removeAction } from "./actions/remove";
import {
  registerZoneAction,
  unregisterZoneAction,
} from "./actions/register-zone";
import { setDataAction } from "./actions/set-data";
import { setUiAction } from "./actions/set-ui";
import { makeStatePublic } from "../lib/data/make-state-public";

export * from "./actions";

export type ActionType = "insert" | "reorder";

export type StateReducer<UserData extends Data = Data> = Reducer<
  PrivateAppState<UserData>,
  PuckAction
>;

function storeInterceptor<UserData extends Data = Data>(
  reducer: StateReducer<UserData>,
  record?: (appState: AppState<UserData>) => void,
  onAction?: OnAction<UserData>
) {
  return (
    state: PrivateAppState<UserData>,
    action: PuckAction
  ): PrivateAppState<UserData> => {
    const newAppState = reducer(state, action);

    const isValidType = ![
      "registerZone",
      "unregisterZone",
      "setData",
      "setUi",
      "set",
    ].includes(action.type);

    if (
      typeof action.recordHistory !== "undefined"
        ? action.recordHistory
        : isValidType
    ) {
      if (record) record(newAppState);
    }

    onAction?.(action, makeStatePublic(newAppState), makeStatePublic(state));

    return newAppState;
  };
}

export function createReducer<UserData extends Data>({
  record,
  onAction,
  appStore,
}: {
  record?: (appState: AppState<UserData>) => void;
  onAction?: OnAction<UserData>;
  appStore: AppStore;
}): StateReducer<UserData> {
  return storeInterceptor(
    (state, action) => {
      if (action.type === "set") {
        return setAction(state, action, appStore) as PrivateAppState<UserData>;
      }

      if (action.type === "insert") {
        return insertAction(state, action, appStore);
      }

      if (action.type === "replace") {
        return replaceAction(state, action, appStore);
      }

      if (action.type === "replaceRoot") {
        return replaceRootAction(state, action, appStore);
      }

      if (action.type === "duplicate") {
        return duplicateAction(state, action, appStore);
      }

      if (action.type === "reorder") {
        return reorderAction(state, action, appStore);
      }

      if (action.type === "move") {
        return moveAction(state, action, appStore);
      }

      if (action.type === "remove") {
        return removeAction(state, action, appStore);
      }

      if (action.type === "registerZone") {
        return registerZoneAction(state, action);
      }

      if (action.type === "unregisterZone") {
        return unregisterZoneAction(state, action);
      }

      if (action.type === "setData") {
        return setDataAction(state, action, appStore);
      }

      if (action.type === "setUi") {
        return setUiAction(state, action);
      }

      return state;
    },
    record,
    onAction
  );
}
