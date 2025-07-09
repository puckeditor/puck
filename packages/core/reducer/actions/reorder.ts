import { Data } from "../../types";
import { ReorderAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { moveAction } from "./move";
import { AppStore } from "../../store";

export const reorderAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: ReorderAction,
  appStore: AppStore
): PrivateAppState<UserData> => {
  return moveAction(
    state,
    {
      type: "move",
      sourceIndex: action.sourceIndex,
      sourceZone: action.destinationZone,
      destinationIndex: action.destinationIndex,
      destinationZone: action.destinationZone,
    },
    appStore
  );
};
