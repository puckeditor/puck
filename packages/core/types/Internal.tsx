import { Slot } from "./API";
import { AppState } from "./AppState";
import { DefaultComponents } from "./Config";
import { ComponentData, Data } from "./Data";
import { DefaultComponentProps } from "./Props";

export type ZoneType = "root" | "dropzone" | "slot";

export type PuckNodeData = {
  data: ComponentData;
  flatData: ComponentData;
  parentId: string | null;
  zone: string;
  path: string[];
};

export type PuckZoneData = {
  contentIds: string[];
  type: ZoneType;
};

export type NodeIndex = Record<string, PuckNodeData>;
export type ZoneIndex = Record<string, PuckZoneData>;

export type PrivateAppState<UserData extends Data = Data> =
  AppState<UserData> & {
    indexes: {
      nodes: NodeIndex;
      zones: ZoneIndex;
    };
  };

type BuiltinTypes =
  | Date
  | RegExp
  | Error
  | Function
  | symbol
  | null
  | undefined;

/**
 * Recursively walk T and replace Slots with SlotComponents
 */
export type WithDeepSlots<T, SlotType = T> =
  // ────────────────────────────── leaf conversions ─────────────────────────────
  T extends Slot
    ? SlotType
    : // ────────────────────────── recurse into arrays & tuples ─────────────────
    T extends (infer U)[]
    ? Array<WithDeepSlots<U, SlotType>>
    : T extends (infer U)[]
    ? WithDeepSlots<U, SlotType>[]
    : // ────────────────────────── preserve objects like Date ───────────────────
    T extends BuiltinTypes
    ? T
    : // ───────────── recurse into objects while preserving optionality ─────────
    T extends object
    ? { [K in keyof T]: WithDeepSlots<T[K], SlotType> }
    : T;

export type ConfigParams<
  Components extends DefaultComponents = DefaultComponents,
  RootProps extends DefaultComponentProps = any,
  CategoryNames extends string[] = string[],
  UserFields extends FieldsExtension = FieldsExtension
> = {
  components?: Components;
  root?: RootProps;
  categories?: CategoryNames;
  fields?: AssertHasValue<UserFields>;
};

export type FieldsExtension = { [Type in string]: { type: Type } };

export type ComponentConfigParams<
  Props extends DefaultComponentProps = DefaultComponentProps,
  UserFields extends FieldsExtension = never
> = {
  props: Props;
  fields?: AssertHasValue<UserFields>;
};

// Check the keys of T do not introduce additional ones to Target
export type Exact<T, Target> = Record<Exclude<keyof T, keyof Target>, never>;

// Ensures the union either extends the left type, or is exactly the right type
// This prevents type widening
export type LeftOrExactRight<Union, Left, Right> =
  | (Left & Union extends Right ? Exact<Union, Right> : Left)
  | (Right & Exact<Union, Right>);

export type AssertHasValue<T, True = T, False = never> = [keyof T] extends [
  never
]
  ? False
  : True;
