import { ReactElement } from "react";
import { DefaultComponentProps, Metadata, UiState } from ".";

type FieldOption = {
  label: string;
  value: string | number | boolean | undefined | null | object;
};

type FieldOptions = Array<FieldOption> | ReadonlyArray<FieldOption>;

export type BaseField = {
  label?: string;
  labelIcon?: ReactElement;
  metadata?: Metadata;
  visible?: boolean;
};

export type TextField = BaseField & {
  type: "text";
  placeholder?: string;
  contentEditable?: boolean;
};

export type NumberField = BaseField & {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type TextareaField = BaseField & {
  type: "textarea";
  placeholder?: string;
  contentEditable?: boolean;
};

export type SelectField = BaseField & {
  type: "select";
  options: FieldOptions;
};

export type RadioField = BaseField & {
  type: "radio";
  options: FieldOptions;
};

export type ArrayField<Props extends any = { [key: string]: any }> =
  Props extends { [key: string]: any }
    ? BaseField & {
        type: "array";
        arrayFields: {
          [SubPropName in keyof Props[0]]: Field<Props[0][SubPropName]>;
        };
        defaultItemProps?: Props[0];
        getItemSummary?: (item: Props[0], index?: number) => string;
        max?: number;
        min?: number;
      }
    : never;

export type ObjectField<Props extends any = { [key: string]: any }> =
  BaseField & {
    type: "object";
    objectFields: {
      [SubPropName in keyof Props]: Field<Props[SubPropName]>;
    };
  };

// DEPRECATED
export type Adaptor<
  AdaptorParams = {},
  TableShape extends Record<string, any> = {},
  PropShape = TableShape
> = {
  name: string;
  fetchList: (adaptorParams?: AdaptorParams) => Promise<TableShape[] | null>;
  mapProp?: (value: TableShape) => PropShape;
};

type NotUndefined<T> = T extends undefined ? Record<string, any> : T;

// DEPRECATED
export type ExternalFieldWithAdaptor<
  Props extends any = { [key: string]: any }
> = BaseField & {
  type: "external";
  placeholder?: string;
  adaptor: Adaptor<any, any, Props>;
  adaptorParams?: object;
  getItemSummary: (item: NotUndefined<Props>, index?: number) => string;
};

export type ExternalField<Props extends any = { [key: string]: any }> =
  BaseField & {
    type: "external";
    placeholder?: string;
    fetchList: (params: {
      query: string;
      filters: Record<string, any>;
    }) => Promise<any[] | null>;
    mapProp?: (value: any) => Props;
    mapRow?: (value: any) => Record<string, string | number | ReactElement>;
    getItemSummary?: (item: NotUndefined<Props>, index?: number) => string;
    showSearch?: boolean;
    renderFooter?: (props: { items: any[] }) => ReactElement;
    initialQuery?: string;
    filterFields?: Record<string, Field>;
    initialFilters?: Record<string, any>;
  };

export type CustomFieldRender<Value extends any> = (props: {
  field: CustomField<Value>;
  name: string;
  id: string;
  value: Value;
  onChange: (value: Value) => void;
  readOnly?: boolean;
}) => ReactElement;

export type CustomField<Value extends any> = BaseField & {
  type: "custom";
  render: CustomFieldRender<Value>;
  contentEditable?: boolean;
};

export type SlotField = BaseField & {
  type: "slot";
  allow?: string[];
  disallow?: string[];
};

export type Field<ValueType = any> =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | ArrayField<ValueType>
  | ObjectField<ValueType>
  | ExternalField<ValueType>
  | ExternalFieldWithAdaptor<ValueType>
  | CustomField<ValueType>
  | SlotField;

export type Fields<
  ComponentProps extends DefaultComponentProps = DefaultComponentProps
> = {
  [PropName in keyof Omit<ComponentProps, "editMode">]: Field<
    ComponentProps[PropName]
  >;
};

export type FieldProps<F = Field<any>, ValueType = any> = {
  field: F;
  value: ValueType;
  id?: string;
  onChange: (value: ValueType, uiState?: Partial<UiState>) => void;
  readOnly?: boolean;
};
