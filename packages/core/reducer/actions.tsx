import { AppState, ComponentData, Data, RootData, UiState } from "../types";
import { PrivateAppState } from "../types/Internal";

export type InsertAction = {
  type: "insert";
  componentType: string;
  destinationIndex: number;
  destinationZone: string;
  id?: string;
};

export type DuplicateAction = {
  type: "duplicate";
  sourceIndex: number;
  sourceZone: string;
};

export type ReplaceAction<UserData extends Data = Data> = {
  type: "replace";
  destinationIndex: number;
  destinationZone: string;
  data: ComponentData;
  ui?: Partial<AppState<UserData>["ui"]>;
};

export type ReplaceRootAction<UserData extends Data = Data> = {
  type: "replaceRoot";
  root: RootData;
  ui?: Partial<AppState<UserData>["ui"]>;
};

export type ReorderAction = {
  type: "reorder";
  sourceIndex: number;
  destinationIndex: number;
  destinationZone: string;
};

export type MoveAction = {
  type: "move";
  sourceIndex: number;
  sourceZone: string;
  destinationIndex: number;
  destinationZone: string;
};

export type RemoveAction = {
  type: "remove";
  index: number;
  zone: string;
};

export type SetUiAction = {
  type: "setUi";
  ui: Partial<UiState> | ((previous: UiState) => Partial<UiState>);
};

export type SetDataAction = {
  type: "setData";
  data: Partial<Data> | ((previous: Data) => Partial<Data>);
};

export type SetAction<UserData extends Data = Data> = {
  type: "set";
  state:
    | Partial<PrivateAppState<UserData>>
    | ((
        previous: PrivateAppState<UserData>
      ) => Partial<PrivateAppState<UserData>>);
};

export type RegisterZoneAction = {
  type: "registerZone";
  zone: string;
};

export type UnregisterZoneAction = {
  type: "unregisterZone";
  zone: string;
};

export type PuckAction = { recordHistory?: boolean } & (
  | ReorderAction
  | InsertAction
  | MoveAction
  | ReplaceAction
  | ReplaceRootAction
  | RemoveAction
  | DuplicateAction
  | SetAction
  | SetDataAction
  | SetUiAction
  | RegisterZoneAction
  | UnregisterZoneAction
);
