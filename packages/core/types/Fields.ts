import { CSSProperties, ReactElement, ReactNode } from "react";
import { DefaultComponentProps, FieldMetadata, UiState } from ".";
import type { Editor, Extensions } from "@tiptap/react";
import {
  EditorState,
  RichTextSelector,
} from "../components/RichTextEditor/types";
import { PuckRichTextOptions } from "../components/RichTextEditor/extension";

type FieldOption = {
  label: string;
  value: string | number | boolean | undefined | null | object;
};

type FieldOptions = Array<FieldOption> | ReadonlyArray<FieldOption>;

export interface BaseField {
  label?: string;
  labelIcon?: ReactElement;
  metadata?: FieldMetadata;
  visible?: boolean;
}

export interface TextField extends BaseField {
  type: "text";
  placeholder?: string;
  contentEditable?: boolean;
}

export interface NumberField extends BaseField {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaField extends BaseField {
  type: "textarea";
  placeholder?: string;
  contentEditable?: boolean;
}

export interface SelectField extends BaseField {
  type: "select";
  options: FieldOptions;
}

export interface RadioField extends BaseField {
  type: "radio";
  options: FieldOptions;
}

export interface RichtextField<
  UserSelector extends RichTextSelector = RichTextSelector
> extends BaseField {
  type: "richtext";
  contentEditable?: boolean;
  initialHeight?: CSSProperties["height"];
  options?: Partial<PuckRichTextOptions>;
  renderMenu?: (props: {
    children: ReactNode;
    editor: Editor | null;
    editorState: EditorState<UserSelector> | null;
    readOnly: boolean;
  }) => ReactNode;
  renderInlineMenu?: (props: {
    children: ReactNode;
    editor: Editor | null;
    editorState: EditorState<UserSelector> | null;
    readOnly: boolean;
  }) => ReactNode;
  tiptap?: {
    selector?: UserSelector;
    extensions?: Extensions;
  };
}

export interface ArrayField<
  Props extends { [key: string]: any }[] = { [key: string]: any }[],
  UserField extends {} = {}
> extends BaseField {
  type: "array";
  arrayFields: {
    [SubPropName in keyof Props[0]]: UserField extends { type: PropertyKey }
      ? Field<Props[0][SubPropName], UserField> | UserField
      : Field<Props[0][SubPropName], UserField>;
  };
  defaultItemProps?: Props[0] | ((index: number) => Props[0]);
  getItemSummary?: (item: Props[0], index?: number) => ReactNode;
  max?: number;
  min?: number;
}

export interface ObjectField<
  Props extends any = { [key: string]: any },
  UserField extends {} = {}
> extends BaseField {
  type: "object";
  objectFields: {
    [SubPropName in keyof Props]: UserField extends { type: PropertyKey }
      ? Field<Props[SubPropName]> | UserField
      : Field<Props[SubPropName]>;
  };
}

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
  getItemSummary: (item: NotUndefined<Props>, index?: number) => ReactNode;
};

export type CacheOpts = {
  enabled?: boolean;
};

export interface ExternalField<Props extends any = { [key: string]: any }>
  extends BaseField {
  type: "external";
  cache?: CacheOpts;
  placeholder?: string;
  fetchList: (params: {
    query: string;
    filters: Record<string, any>;
  }) => Promise<any[] | null>;
  mapProp?: (value: any) => Props;
  mapRow?: (value: any) => Record<string, string | number | ReactElement>;
  getItemSummary?: (item: NotUndefined<Props>, index?: number) => ReactNode;
  showSearch?: boolean;
  renderFooter?: (props: { items: any[] }) => ReactElement;
  initialQuery?: string;
  filterFields?: Record<string, Field>;
  initialFilters?: Record<string, any>;
}

export type CustomFieldRender<Value extends any> = (props: {
  field: CustomField<Value>;
  name: string;
  id: string;
  value: Value;
  onChange: (value: Value) => void;
  readOnly?: boolean;
}) => ReactElement;

export interface CustomField<Value extends any> extends BaseField {
  type: "custom";
  render: CustomFieldRender<Value>;
  contentEditable?: boolean;
  key?: string;
}

export interface SlotField extends BaseField {
  type: "slot";
  allow?: string[];
  disallow?: string[];
}

export type Field<ValueType = any, UserField extends {} = {}> =
  | TextField
  | RichtextField
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
