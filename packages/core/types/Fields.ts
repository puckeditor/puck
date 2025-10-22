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

export type ArrayField<
  Props extends { [key: string]: any }[] = { [key: string]: any }[],
  UserField extends {} = {}
> = BaseField & {
  type: "array";
  arrayFields: {
    [SubPropName in keyof Props[0]]: UserField extends { type: PropertyKey }
      ? Field<Props[0][SubPropName], UserField> | UserField
      : Field<Props[0][SubPropName], UserField>;
  };
  defaultItemProps?: Props[0] | ((index: number) => Props[0]);
  getItemSummary?: (item: Props[0], index?: number) => string;
  max?: number;
  min?: number;
};

export type ObjectField<
  Props extends any = { [key: string]: any },
  UserField extends {} = {}
> = BaseField & {
  type: "object";
  objectFields: {
    [SubPropName in keyof Props]: UserField extends { type: PropertyKey }
      ? Field<Props[SubPropName]> | UserField
      : Field<Props[SubPropName]>;
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

type NotUndefined<T> = T extends undefined ? never : T;

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

export type CacheOpts = {
  enabled?: boolean;
};

export type ExternalField<Props extends any = { [key: string]: any }> =
  BaseField & {
    type: "external";
    cache?: CacheOpts;
    placeholder?: string;
    fetchList: (params: {
      query: string;
      filters: Record<string, any>;
      page?: number;
      limit?: number;
      sort?: { column: string; direction: "asc" | "desc" };
    }) => Promise<{ items: any[]; total?: number } | null>;
    mapProp?: (value: any) => Props;
    mapRow?: (value: any) => Record<string, string | number | ReactElement>;
    getItemSummary?: (item: NotUndefined<Props>, index?: number) => string;
    showSearch?: boolean;
    renderFooter?: (props: { items: any[] }) => ReactElement;
    initialQuery?: string;
    filterFields?: Record<string, Field>;
    initialFilters?: Record<string, any>;
    sortableColumns?: string[];
    pagination?: {
      enabled?: boolean;
      pageSizeOptions?: number[];
      initialPage?: number;
      initialPageSize?: number;
    };
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

export type Field<ValueType = any, UserField extends {} = {}> =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | ArrayField<
      ValueType extends { [key: string]: any }[] ? ValueType : never,
      UserField
    >
  | ObjectField<ValueType, UserField>
  | ExternalField<ValueType>
  | ExternalFieldWithAdaptor<ValueType>
  | CustomField<ValueType>
  | SlotField;

export type Fields<
  ComponentProps extends DefaultComponentProps = DefaultComponentProps,
  UserField extends {} = {}
> = {
  [PropName in keyof Omit<ComponentProps, "editMode">]: UserField extends {
    type: PropertyKey;
  }
    ? Field<ComponentProps[PropName], UserField> | UserField
    : Field<ComponentProps[PropName]>;
};

export type FieldProps<F = Field<any>, ValueType = any> = {
  field: F;
  value: ValueType;
  id?: string;
  onChange: (value: ValueType, uiState?: Partial<UiState>) => void;
  readOnly?: boolean;
};
