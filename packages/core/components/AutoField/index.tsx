import getClassNameFactory from "../../lib/get-class-name-factory";
import { Field, FieldProps } from "../../types";

import styles from "./styles.module.css";
import {
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  RadioField,
  SelectField,
  ExternalField,
  ArrayField,
  DefaultField,
  TextareaField,
  RichtextField,
} from "./fields";
import { ObjectField } from "./fields/ObjectField";
import { useAppStore } from "../../store";
import { useSafeId } from "../../lib/use-safe-id";
import { NestedFieldContext } from "./context";
import { useShallow } from "zustand/react/shallow";
import { getDeep } from "../../lib/data/get-deep";
import type {
  FieldLabelPropsInternal,
  FieldPropsInternalOptional,
} from "./FieldLabel";
import { FieldLabelInternal } from "./FieldLabel";
import { useFieldStore, useFieldStoreApi, fieldContextStore } from "./store";

const getClassName = getClassNameFactory("Input", styles);
const getClassNameWrapper = getClassNameFactory("InputWrapper", styles);

export type FieldPropsInternal<ValueType = any, F = Field<any>> = FieldProps<
  F,
  ValueType
> & {
  Label: React.FC<FieldLabelPropsInternal>;
  label?: string;
  labelIcon?: ReactNode;
  id: string;
  name?: string;
};

export { FieldLabel } from "./FieldLabel";

const defaultFields = {
  array: ArrayField,
  external: ExternalField,
  object: ObjectField,
  select: SelectField,
  textarea: TextareaField,
  radio: RadioField,
  text: DefaultField,
  number: DefaultField,
  richtext: RichtextField,
};

function AutoFieldInternal<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(
  props: FieldPropsInternalOptional<ValueType, FieldType> & {
    Label?: React.FC<FieldLabelPropsInternal>;
  }
) {
  const dispatch = useAppStore((s) => s.dispatch);
  const overrides = useAppStore((s) => s.overrides);
  const readOnly = useAppStore(useShallow((s) => s.selectedItem?.readOnly));
  const nestedFieldContext = useContext(NestedFieldContext);

  const { id, Label = FieldLabelInternal } = props;

  const field = props.field as Field<ValueType>;
  const label = field.label;
  const labelIcon = field.labelIcon;

  const defaultId = useSafeId();
  const resolvedId = id || defaultId;

  const render = useMemo(
    () => ({
      ...overrides.fieldTypes,
      custom: overrides.fieldTypes?.custom,
      array: overrides.fieldTypes?.array || defaultFields.array,
      external: overrides.fieldTypes?.external || defaultFields.external,
      object: overrides.fieldTypes?.object || defaultFields.object,
      select: overrides.fieldTypes?.select || defaultFields.select,
      textarea: overrides.fieldTypes?.textarea || defaultFields.textarea,
      radio: overrides.fieldTypes?.radio || defaultFields.radio,
      text: overrides.fieldTypes?.text || defaultFields.text,
      number: overrides.fieldTypes?.number || defaultFields.number,
      richtext: overrides.fieldTypes?.richtext || defaultFields.richtext,
    }),
    [overrides]
  );

  const fieldValue = useFieldStore((s) => {
    // Always set a value for custom fields, or when an override is provided
    if (field.type === "custom" || overrides.fieldTypes?.[field.type]) {
      return getDeep(s, props.name ?? resolvedId);
    }
  });

  const mergedProps = useMemo(
    () => ({
      ...props,
      field,
      label,
      labelIcon,
      Label,
      id: resolvedId,
      value: fieldValue,
    }),
    [props, field, label, labelIcon, Label, resolvedId, fieldValue]
  );

  const onFocus = useCallback(
    (e: React.FocusEvent) => {
      if (
        mergedProps.name &&
        (e.target.nodeName === "INPUT" || e.target.nodeName === "TEXTAREA")
      ) {
        e.stopPropagation();

        dispatch({
          type: "setUi",
          ui: {
            field: { focus: mergedProps.name },
          },
        });
      }
    },
    [mergedProps.name]
  );

  const onBlur = useCallback((e: React.FocusEvent) => {
    if ("name" in e.target) {
      dispatch({
        type: "setUi",
        ui: {
          field: { focus: null },
        },
      });
    }
  }, []);

  let Children = useMemo(() => {
    if (field.type !== "custom" && field.type !== "slot") {
      return defaultFields[field.type];
    }

    return (_props: any) => null;
  }, [field.type]);

  const fieldKey = field.type === "custom" ? field.key : undefined;

  let FieldComponent: React.ComponentType<any> = useMemo(() => {
    // if there's an override provided for custom fields, fallback to standard behavior
    if (field.type === "custom" && !render[field.type]) {
      if (!field.render) {
        return null;
      }
      return field.render as any;
    } else if (field.type !== "slot") {
      return render[field.type] as (props: FieldProps) => ReactElement;
    }
  }, [field.type, fieldKey, render]);

  const { visible = true } = props.field;

  if (!visible) {
    return null;
  }

  if (field.type === "slot") {
    return null;
  }

  if (!FieldComponent) {
    throw new Error(`Field type for ${field.type} did not exist.`);
  }

  return (
    <NestedFieldContext.Provider
      value={{
        readOnlyFields: nestedFieldContext.readOnlyFields || readOnly || {},
        localName: nestedFieldContext.localName ?? mergedProps.name,
      }}
    >
      <div
        className={getClassNameWrapper()}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={(e) => {
          // Prevent propagation of any click events to parent field.
          // For example, a field within an array may bubble an event
          // and fail to stop propagation.
          e.stopPropagation();
        }}
      >
        <FieldComponent {...mergedProps}>
          <Children {...(mergedProps as any)} />
        </FieldComponent>
      </div>
    </NestedFieldContext.Provider>
  );
}

type FieldNoLabel<Props extends any = any> = Omit<Field<Props>, "label">;

export function AutoFieldPrivate<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(
  props: Omit<FieldPropsInternalOptional<ValueType, FieldType>, "value"> & {
    Label?: React.FC<FieldLabelPropsInternal>;
    value?: any;
  }
) {
  return <AutoFieldInternal<ValueType, FieldType> {...props} />;
}

function AutoFieldPublicInternal<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>({ value, ...props }: FieldProps<FieldType, ValueType> & { value: any }) {
  const DefaultLabel = useMemo(() => {
    const DefaultLabel = (labelProps: any) => (
      <div
        {...labelProps}
        className={getClassName({ readOnly: props.readOnly })}
      />
    );

    return DefaultLabel;
  }, [props.readOnly]);

  const fieldStore = useFieldStoreApi();

  const onChange = useCallback(
    (value: any) => {
      if (!props.id) return;

      fieldStore.setState({ [props.id]: value });

      props.onChange(value);
    },
    [fieldStore, props.onChange, props.id]
  );

  useEffect(() => {
    if (!props.id) return;

    fieldStore.setState({ [props.id]: value });
  }, [props.id, value, fieldStore]);

  return (
    <AutoFieldInternal<ValueType, FieldType>
      {...props}
      onChange={onChange}
      Label={DefaultLabel}
    />
  );
}

export function AutoField<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(props: FieldProps<FieldType, ValueType> & { value: any }) {
  const id = useSafeId();

  if (props.field.type === "slot") {
    return null;
  }

  return (
    <fieldContextStore.Provider value={{ [id]: props.value }}>
      <AutoFieldPublicInternal<ValueType, FieldType> {...props} id={id} />
    </fieldContextStore.Provider>
  );
}
