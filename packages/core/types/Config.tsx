import type { JSX, ReactNode } from "react";
import { BaseField, Fields } from "./Fields";
import { ComponentData, Metadata, RootData } from "./Data";

import { AsFieldProps, WithChildren, WithId, WithPuckProps } from "./Utils";
import { AppState } from "./AppState";
import { DefaultComponentProps } from "./Props";
import { Permissions } from "./API";
import { DropZoneProps } from "../components/DropZone/types";
import {
  ComponentConfigParams,
  ConfigParams,
  ExactComponentConfigParams,
  ExactConfigParams,
  FieldsExtension,
  WithDeepSlots,
} from "./Internal";

export type SlotComponent = (props?: Omit<DropZoneProps, "zone">) => ReactNode;

export type PuckComponent<Props> = (
  props: WithId<
    WithPuckProps<{
      [K in keyof Props]: WithDeepSlots<Props[K], SlotComponent>;
    }>
  >
) => JSX.Element;

export type ResolveDataTrigger = "insert" | "replace" | "load" | "force";

type WithPartialProps<T, Props extends DefaultComponentProps> = Omit<
  T,
  "props"
> & {
  props?: Partial<Props>;
};

type ComponentConfigInternal<
  RenderProps extends DefaultComponentProps = DefaultComponentProps,
  FieldProps extends DefaultComponentProps = RenderProps,
  DataShape = Omit<ComponentData<FieldProps>, "type">, // NB this doesn't include AllProps, so types will not contain deep slot types. To fix, we require a breaking change.
  UserField extends {} = {}
> = {
  render: PuckComponent<RenderProps>;
  label?: string;
  defaultProps?: FieldProps;
  fields?: Fields<FieldProps, UserField & BaseField>;
  permissions?: Partial<Permissions>;
  inline?: boolean;
  resolveFields?: (
    data: DataShape,
    params: {
      changed: Partial<Record<keyof FieldProps, boolean> & { id: string }>;
      fields: Fields<FieldProps>;
      lastFields: Fields<FieldProps>;
      lastData: DataShape | null;
      appState: AppState;
      parent: ComponentData | null;
    }
  ) => Promise<Fields<FieldProps>> | Fields<FieldProps>;
  resolveData?: (
    data: DataShape,
    params: {
      changed: Partial<Record<keyof FieldProps, boolean> & { id: string }>;
      lastData: DataShape | null;
      metadata: Metadata;
      trigger: ResolveDataTrigger;
    }
  ) =>
    | Promise<WithPartialProps<DataShape, FieldProps>>
    | WithPartialProps<DataShape, FieldProps>;
  resolvePermissions?: (
    data: DataShape,
    params: {
      changed: Partial<Record<keyof FieldProps, boolean> & { id: string }>;
      lastPermissions: Partial<Permissions>;
      permissions: Partial<Permissions>;
      appState: AppState;
      lastData: DataShape | null;
    }
  ) => Promise<Partial<Permissions>> | Partial<Permissions>;
  metadata?: Metadata;
};

// DEPRECATED - remove old generics in favour of Params
export type ComponentConfig<
  RenderPropsOrParams extends
    | (DefaultComponentProps & RenderPropsOrParams extends ComponentConfigParams
        ? ExactComponentConfigParams<RenderPropsOrParams>
        : DefaultComponentProps)
    | (ComponentConfigParams &
        ExactComponentConfigParams<RenderPropsOrParams>) = DefaultComponentProps,
  FieldProps extends DefaultComponentProps = RenderPropsOrParams extends ComponentConfigParams
    ? RenderPropsOrParams["props"]
    : RenderPropsOrParams,
  DataShape = Omit<ComponentData<FieldProps>, "type"> // NB this doesn't include AllProps, so types will not contain deep slot types. To fix, we require a breaking change.
> = ComponentConfigInternal<
  RenderPropsOrParams extends ComponentConfigParams
    ? RenderPropsOrParams["props"]
    : RenderPropsOrParams,
  FieldProps,
  DataShape,
  RenderPropsOrParams extends { fields: FieldsExtension }
    ? RenderPropsOrParams["fields"][keyof RenderPropsOrParams["fields"]] // Combine fields into union
    : {}
>;

export type RootConfig<
  RootPropsOrParams extends DefaultComponentProps | ComponentConfigParams = any
> = RootPropsOrParams extends ComponentConfigParams<infer ParamProps>
  ? Partial<
      ComponentConfigInternal<
        WithChildren<ParamProps>,
        AsFieldProps<ParamProps>,
        RootData<AsFieldProps<ParamProps>>,
        RootPropsOrParams extends { fields: FieldsExtension }
          ? RootPropsOrParams["fields"][keyof RootPropsOrParams["fields"]] // Combine fields into union
          : {}
      >
    >
  : RootPropsOrParams extends DefaultComponentProps
  ? Partial<
      ComponentConfigInternal<
        WithChildren<RootPropsOrParams>,
        AsFieldProps<RootPropsOrParams>,
        RootData<AsFieldProps<RootPropsOrParams>>
      >
    >
  : never;

type Category<ComponentName> = {
  components?: ComponentName[];
  title?: string;
  visible?: boolean;
  defaultExpanded?: boolean;
};

type ConfigInternal<
  Props extends DefaultComponents = DefaultComponents,
  RootProps extends DefaultComponentProps = any,
  CategoryName extends string = string,
  UserField extends {} = {}
> = {
  categories?: Record<CategoryName, Category<keyof Props>> & {
    other?: Category<keyof Props>;
  };
  components: {
    [ComponentName in keyof Props]: Omit<
      ComponentConfigInternal<
        Props[ComponentName],
        Props[ComponentName],
        Omit<ComponentData<Props[ComponentName]>, "type">,
        UserField
      >,
      "type"
    >;
  };
  root?: RootConfig<RootProps>;
};

// This _deliberately_ casts as any so the user can pass in something that widens the types
export type DefaultComponents = Record<string, any>;

// DEPRECATED - remove old generics in favour of Params
export type Config<
  PropsOrParams extends
    | (DefaultComponents & PropsOrParams extends ConfigParams // Catch any type widening
        ? ExactConfigParams<PropsOrParams>
        : DefaultComponents)
    | (ConfigParams & ExactConfigParams<PropsOrParams>) =
    | DefaultComponents
    | ConfigParams,
  RootProps extends DefaultComponentProps = any,
  CategoryName extends string = string
> = ConfigInternal<
  PropsOrParams extends ConfigParams<infer Props> ? Props : PropsOrParams,
  RootProps,
  CategoryName,
  PropsOrParams extends ConfigParams<any, any, any, infer UserFields>
    ? UserFields[keyof UserFields] // Combine fields into union
    : {}
> & {
  params?: PropsOrParams; // Add params to type to prevent type erasure
};
