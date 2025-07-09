import { DefaultAllProps, WithDeepSlots } from "./Internal";
import { DefaultComponentProps, DefaultRootFieldProps } from "./Props";
import { AsFieldProps, WithId } from "./Utils";

export type BaseData<
  Props extends { [key: string]: any } = { [key: string]: any }
> = {
  readOnly?: Partial<Record<keyof Props, boolean>>;
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
  AllProps extends Record<string, DefaultComponentProps> = Record<
    string,
    DefaultComponentProps
  >
> = {
  type: Name;
  props: WithDeepSlots<WithId<Props>, Content<AllProps>>;
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
  AllProps extends DefaultAllProps = DefaultAllProps
> = {
  [K in keyof AllProps]: ComponentData<
    AllProps[K],
    K extends string ? K : never,
    AllProps
  >;
}[keyof AllProps];

export type Content<
  PropsMap extends { [key: string]: DefaultComponentProps } = {
    [key: string]: DefaultComponentProps;
  }
> = ComponentDataMap<PropsMap>[];

export type Data<
  AllProps extends DefaultAllProps = DefaultAllProps,
  RootProps extends DefaultComponentProps = DefaultRootFieldProps
> = {
  root: WithDeepSlots<RootData<RootProps>, Content<AllProps>>;
  content: Content<AllProps>;
  zones?: Record<string, Content<AllProps>>;
};

export type Metadata = { [key: string]: any };
