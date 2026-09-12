import { DefaultComponents } from "./Config";
import { WithDeepSlots } from "./Internal";
import { DefaultComponentProps, DefaultRootFieldProps } from "./Props";
import { AsFieldProps, WithId } from "./Utils";

export type BaseData<
  Props extends { [key: string]: any } = { [key: string]: any }
> = {
  readOnly?: Partial<Record<keyof Props, boolean>>;
  /** Per-instance metadata. The __puck property is removed from all components in the tree when passing data down to the Render component, before the components are actually rendered. This avoids polluting data sent to user pages when doing SSR. */
  __puck?: {
    /** User-set custom label for this component instance. */
    label?: string;
  };
};

export type RootDataWithProps<
  Props extends DefaultComponentProps = DefaultRootFieldProps
> = BaseData<Props> & {
  props: Props;
};

// DEPRECATED
export type RootDataWithoutProps<
  Props extends DefaultComponentProps = DefaultRootFieldProps
> = Props;

export type RootData<
  Props extends DefaultComponentProps = DefaultRootFieldProps
> = Partial<RootDataWithProps<AsFieldProps<Props>>> &
  Partial<RootDataWithoutProps<Props>>; // DEPRECATED

export type ComponentData<
  Props extends DefaultComponentProps = DefaultComponentProps,
  Name = string,
  Components extends Record<string, DefaultComponentProps> = Record<
    string,
    DefaultComponentProps
  >
> = {
  type: Name;
  props: WithDeepSlots<WithId<Props>, Content<Components>>;
} & BaseData<Props>;

export type ComponentDataOptionalId<
  Props extends DefaultComponentProps = DefaultComponentProps,
  Name = string
> = {
  type: Name;
  props: Props & {
    id?: string;
  };
} & BaseData<Props>;

// Backwards compatibility
export type MappedItem = ComponentData;

export type ComponentDataMap<
  Components extends DefaultComponents = DefaultComponents
> = {
  [K in keyof Components]: ComponentData<
    Components[K],
    K extends string ? K : never,
    Components
  >;
}[keyof Components];

export type Content<
  PropsMap extends { [key: string]: DefaultComponentProps } = {
    [key: string]: DefaultComponentProps;
  }
> = ComponentDataMap<PropsMap>[];

export type Data<
  Components extends DefaultComponents = DefaultComponents,
  RootProps extends DefaultComponentProps = DefaultRootFieldProps
> = {
  root: WithDeepSlots<RootData<RootProps>, Content<Components>>;
  content: Content<Components>;
  zones?: Record<string, Content<Components>>;
};

export type Metadata = { [key: string]: any };

export interface PuckMetadata extends Metadata {}

export interface ComponentMetadata extends PuckMetadata {}

export interface FieldMetadata extends Metadata {}
