import { Slot } from "./API";
import { AppState } from "./AppState";
import { ComponentConfig, Config, DefaultComponents } from "./Config";
import { ComponentData, Data } from "./Data";
import { Field } from "./Fields";
import { DefaultComponentProps, DefaultRootFieldProps } from "./Props";

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
  CategoryNames extends string[] = [],
  UserFields extends FieldsExtension = {}
> = {
  components?: Components;
  root?: RootProps;
  categoryNames?: CategoryNames;
  fields?: UserFields;
};

export type FieldsExtension = { [Type in string]: { type: Type } };

export type ComponentConfigParams<
  Props extends DefaultComponentProps = DefaultComponentProps,
  UserField extends FieldsExtension = FieldsExtension
> = {
  props: Props;
  fields?: UserField;
};

export type ExtractConfigParams<UserConfig extends Config> =
  UserConfig extends Config<
    infer PropsOrParams,
    infer RootProps,
    infer CategoryName
  >
    ? {
        props: PropsOrParams extends ConfigParams<infer Props> ? Props : never;
        rootProps: PropsOrParams extends ConfigParams<any, infer ParamRootProps>
          ? ParamRootProps & DefaultRootFieldProps
          : RootProps & DefaultRootFieldProps;
        categoryNames: PropsOrParams extends ConfigParams<
          any,
          any,
          infer ParamCategoryName
        >
          ? ParamCategoryName[keyof ParamCategoryName] // Convert to union
          : CategoryName;
        fields: PropsOrParams extends ConfigParams<
          any,
          any,
          any,
          infer ParamField
        >
          ? ParamField
          : never;
      }
    : never;
