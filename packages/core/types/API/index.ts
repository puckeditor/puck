import { PuckAction } from "../../reducer";
import { DefaultAllProps, WithDeepSlots } from "../Internal";
import { DefaultComponentProps } from "../Props";
import { AppState } from "./../AppState";
import { ComponentDataOptionalId, Content, Data } from "./../Data";
import { Overrides } from "./Overrides";
import { FieldTransforms } from "./FieldTransforms";

export type Permissions = {
  drag: boolean;
  duplicate: boolean;
  delete: boolean;
  edit: boolean;
  insert: boolean;
} & Record<string, boolean>;

export type IframeConfig = {
  enabled?: boolean;
  waitForStyles?: boolean;
};

export type OnAction<UserData extends Data = Data> = (
  action: PuckAction,
  appState: AppState<UserData>,
  prevAppState: AppState<UserData>
) => void;

export type Plugin = {
  overrides?: Partial<Overrides>;
  fieldTransforms?: FieldTransforms;
};

export type History<D = any> = {
  state: D;
  id?: string;
};

type InitialHistoryAppend<AS = Partial<AppState>> = {
  histories: History<AS>[];
  index?: number;
  appendData?: true;
};

type InitialHistoryNoAppend<AS = Partial<AppState>> = {
  histories: [History<AS>, ...History<AS>[]]; // Array with minimum length of 1
  index?: number;
  appendData?: false;
};

export type InitialHistory<AS = Partial<AppState>> =
  | InitialHistoryAppend<AS>
  | InitialHistoryNoAppend<AS>;

export type Slot<
  Props extends { [key: string]: DefaultComponentProps } = {
    [key: string]: DefaultComponentProps;
  }
> = {
  [K in keyof Props]: ComponentDataOptionalId<
    Props[K],
    K extends string ? K : never
  >;
}[keyof Props][];

export type WithSlotProps<
  Target extends Record<string, any>,
  AllProps extends DefaultAllProps = DefaultAllProps,
  SlotType extends Content<AllProps> = Content<AllProps>
> = WithDeepSlots<Target, SlotType>;

export * from "./DropZone";
export * from "./Viewports";

export type { Overrides };

export * from "./FieldTransforms";
