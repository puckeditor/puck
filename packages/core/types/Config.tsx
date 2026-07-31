import type { JSX, ReactNode } from "react";
import { BaseField, Field, Fields } from "./Fields";
import { ComponentData, ComponentMetadata, RootData } from "./Data";

import { AsFieldProps, WithChildren, WithId, WithPuckProps } from "./Utils";
import { AppState } from "./AppState";
import { DefaultComponentProps, DefaultRootFieldProps } from "./Props";
import { Permissions } from "./API";
import { DropZoneProps } from "../components/DropZone/types";
import {
  AssertHasValue,
  FieldsExtension,
  LeftOrExactRight,
  WithDeepSlots,
} from "./Internal";

export type SlotComponent<AvailableComponents extends string = string> = (
  props?: Omit<DropZoneProps<AvailableComponents>, "zone">
) => ReactNode;

export type PuckComponent<
  Props,
  AvailableComponents extends string = string
> = (
  props: WithId<
    WithPuckProps<{
      [K in keyof Props]: WithDeepSlots<
        Props[K],
        SlotComponent<AvailableComponents>
      >;
    }>
  >
) => JSX.Element;

export type ResolveDataTrigger =
  | "insert"
  | "replace"
  | "load"
  | "force"
  | "move";

type WithPartialProps<T, Props extends DefaultComponentProps> = Omit<
  T,
  "props"
> & {
  props?: Partial<Props>;
};

export interface ComponentConfigExtensions {}

type ComponentConfigInternal<
  RenderProps extends DefaultComponentProps,
  AvailableComponents extends string,
  FieldProps extends DefaultComponentProps,
  DataShape = Omit<ComponentData<FieldProps>, "type">, // NB this doesn't include AllProps, so types will not contain deep slot types. To fix, we require a breaking change.
  UserField extends BaseField = {}
> = {
  render: PuckComponent<RenderProps, AvailableComponents>;
  label?: string;
  defaultProps?: FieldProps;
  fields?: Fields<FieldProps, UserField, AvailableComponents>;
  permissions?: Partial<Permissions>;
  inline?: boolean;
  resolveFields?: (
    data: DataShape,
    params: {
      changed: Partial<Record<keyof FieldProps, boolean> & { id: string }>;
      fields: Fields<FieldProps>;
      lastFields: Fields<FieldProps>;
      lastData: DataShape | null;
      metadata: ComponentMetadata;
      appState: AppState;
      parent: ComponentData | null;
    }
  ) => Promise<Fields<FieldProps>> | Fields<FieldProps>;
  resolveData?: (
    data: DataShape,
    params: {
      changed: Partial<Record<keyof FieldProps, boolean> & { id: string }>;
      lastData: DataShape | null;
      metadata: ComponentMetadata;
      trigger: ResolveDataTrigger;
      parent: ComponentData | null;
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
      parent: ComponentData | null;
    }
  ) => Promise<Partial<Permissions>> | Partial<Permissions>;
  metadata?: ComponentMetadata;
} & ComponentConfigExtensions;

// DEPRECATED - remove old generics in favour of Params
export type ComponentConfig<
  RenderPropsOrParams extends LeftOrExactRight<
    RenderPropsOrParams,
    DefaultComponentProps,
    ComponentConfigParams
  > = DefaultComponentProps,
  FieldProps extends DefaultComponentProps = RenderPropsOrParams extends {
    props: any;
  }
    ? RenderPropsOrParams["props"]
    : RenderPropsOrParams,
  DataShape = Omit<ComponentData<FieldProps>, "type"> // NB this doesn't include AllProps, so types will not contain deep slot types. To fix, we require a breaking change.
> = RenderPropsOrParams extends ComponentConfigParams<
  infer ParamsRenderProps,
  never,
  infer Components
>
  ? ComponentConfigInternal<
      ParamsRenderProps,
      Components,
      FieldProps,
      DataShape,
      {}
    >
  : RenderPropsOrParams extends ComponentConfigParams<
      infer ParamsRenderProps,
      infer ParamsFields,
      infer Components
    >
  ? ComponentConfigInternal<
      ParamsRenderProps,
      Components,
      FieldProps,
      DataShape,
      ParamsFields[keyof ParamsFields] & BaseField
    >
  : ComponentConfigInternal<RenderPropsOrParams, string, FieldProps, DataShape>;

type RootConfigInternal<
  RootProps extends DefaultComponentProps = DefaultComponentProps,
  AvailableComponents extends string = string,
  UserField extends BaseField = {}
> = Partial<
  ComponentConfigInternal<
    WithChildren<RootProps>,
    AvailableComponents,
    AsFieldProps<RootProps>,
    RootData<AsFieldProps<RootProps>>,
    UserField
  >
>;

// DEPRECATED - remove old generics in favour of Params
export type RootConfig<
  RootPropsOrParams extends LeftOrExactRight<
    RootPropsOrParams,
    DefaultComponentProps,
    ComponentConfigParams
  > = DefaultComponentProps
> = RootPropsOrParams extends ComponentConfigParams<
  infer Props,
  never,
  infer Components
>
  ? Partial<RootConfigInternal<WithChildren<Props>, Components, {}>>
  : RootPropsOrParams extends ComponentConfigParams<
      infer Props,
      infer UserFields,
      infer Components
    >
  ? Partial<
      RootConfigInternal<
        WithChildren<Props>,
        Components,
        UserFields[keyof UserFields] & BaseField
      >
    >
  : Partial<RootConfigInternal<WithChildren<RootPropsOrParams>>>;

type Category<ComponentName> = {
  components?: ComponentName[];
  title?: string;
  visible?: boolean;
  defaultExpanded?: boolean;
};

type ConfigInternal<
  Props extends DefaultComponents = DefaultComponents,
  RootProps extends DefaultComponentProps = DefaultComponentProps,
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
        Extract<keyof Props, string>, // We need to extract string here because keyof Props can be string | number | symbol, but we only want string for the AvailableComponents type parameter
        Props[ComponentName],
        Omit<ComponentData<Props[ComponentName]>, "type">,
        UserField
      >,
      "type"
    >;
  };
  root?: RootConfigInternal<RootProps, Extract<keyof Props, string>, UserField>;
};

// This _deliberately_ casts as any so the user can pass in something that widens the types
export type DefaultComponents = Record<string, any>;

// DEPRECATED - remove old generics in favour of Params
export type Config<
  PropsOrParams extends LeftOrExactRight<
    PropsOrParams,
    DefaultComponents,
    ConfigParams
  > = DefaultComponents | ConfigParams,
  RootProps extends DefaultComponentProps = any,
  CategoryName extends string = string
> = PropsOrParams extends ConfigParams<
  infer ParamComponents,
  infer ParamRoot,
  infer ParamCategoryName,
  never
>
  ? ConfigInternal<ParamComponents, ParamRoot, ParamCategoryName[number]>
  : PropsOrParams extends ConfigParams<
      infer ParamComponents,
      infer ParamRoot,
      infer ParamCategoryName,
      infer ParamFields
    >
  ? ConfigInternal<
      ParamComponents,
      ParamRoot,
      ParamCategoryName[number],
      ParamFields[keyof ParamFields] & BaseField
    >
  : PropsOrParams extends ConfigParams<
      infer ParamComponents,
      infer ParamRoot,
      infer ParamCategoryName,
      any
    >
  ? ConfigInternal<ParamComponents, ParamRoot, ParamCategoryName[number], {}>
  : ConfigInternal<PropsOrParams, RootProps, CategoryName>;

export type ExtractConfigParams<UserConfig extends ConfigInternal> =
  UserConfig extends ConfigInternal<
    infer PropsOrParams,
    infer RootProps,
    infer CategoryName,
    infer UserField
  >
    ? {
        props: PropsOrParams;
        rootProps: RootProps & DefaultRootFieldProps;
        categoryNames: CategoryName;
        field: UserField extends { type: string } ? UserField : Field;
      }
    : never;

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

export type ComponentConfigParams<
  Props extends DefaultComponentProps = DefaultComponentProps,
  UserFields extends FieldsExtension = never,
  AvailableComponents extends string = string
> = {
  props: Props;
  availableComponents?: AvailableComponents;
  fields?: AssertHasValue<UserFields>;
};
