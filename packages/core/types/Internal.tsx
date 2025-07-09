import { Slot } from "./API";
import { AppState } from "./AppState";
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

export type DefaultAllProps = Record<string, DefaultComponentProps>;

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
