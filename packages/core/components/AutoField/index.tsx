import getClassNameFactory from "../../lib/get-class-name-factory";
import { Field, FieldProps } from "../../types";
import { UiState } from "../../types";

import styles from "./styles.module.css";
import {
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  RadioField,
  SelectField,
  ExternalField,
  ArrayField,
  DefaultField,
  TextareaField,
} from "./fields";
import { Lock } from "lucide-react";
import { ObjectField } from "./fields/ObjectField";
import { useAppStore } from "../../store";
import { useSafeId } from "../../lib/use-safe-id";
import { NestedFieldContext } from "./context";
import { useShallow } from "zustand/react/shallow";
import { getDeep } from "../../lib/data/get-deep";

const getClassName = getClassNameFactory("Input", styles);
const getClassNameWrapper = getClassNameFactory("InputWrapper", styles);

export const FieldLabel = ({
  children,
  icon,
  label,
  el = "label",
  readOnly,
  className,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  label: string;
  el?: "label" | "div";
  readOnly?: boolean;
  className?: string;
}) => {
  const El = el;
  return (
    <El className={className}>
      <div className={getClassName("label")}>
        {icon ? <div className={getClassName("labelIcon")}>{icon}</div> : <></>}
        {label}

        {readOnly && (
          <div className={getClassName("disabledIcon")} title="Read-only">
            <Lock size="12" />
          </div>
        )}
      </div>
      {children}
    </El>
  );
};

type FieldLabelPropsInternal = {
  children?: ReactNode;
  icon?: ReactNode;
  label?: string;
  el?: "label" | "div";
  readOnly?: boolean;
};

export const FieldLabelInternal = ({
  children,
  icon,
  label,
  el = "label",
  readOnly,
}: FieldLabelPropsInternal) => {
  const overrides = useAppStore((s) => s.overrides);

  const Wrapper = useMemo(
    () => overrides.fieldLabel || FieldLabel,
    [overrides]
  );

  if (!label) {
    return <>{children}</>;
  }

  return (
    <Wrapper
      label={label}
      icon={icon}
      className={getClassName({ readOnly })}
      readOnly={readOnly}
      el={el}
    >
      {children}
    </Wrapper>
  );
};

type FieldPropsInternalOptional<ValueType = any, F = Field<any>> = FieldProps<
  F,
  ValueType
> & {
  Label?: React.FC<FieldLabelPropsInternal>;
  label?: string;
  labelIcon?: ReactNode;
  name?: string;
};

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

const defaultFields = {
  array: ArrayField,
  external: ExternalField,
  object: ObjectField,
  select: SelectField,
  textarea: TextareaField,
  radio: RadioField,
  text: DefaultField,
  number: DefaultField,
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
      array: overrides.fieldTypes?.array || defaultFields.array,
      external: overrides.fieldTypes?.external || defaultFields.external,
      object: overrides.fieldTypes?.object || defaultFields.object,
      select: overrides.fieldTypes?.select || defaultFields.select,
      textarea: overrides.fieldTypes?.textarea || defaultFields.textarea,
      radio: overrides.fieldTypes?.radio || defaultFields.radio,
      text: overrides.fieldTypes?.text || defaultFields.text,
      number: overrides.fieldTypes?.number || defaultFields.number,
    }),
    [overrides]
  );

  const mergedProps = useMemo(
    () => ({
      ...props,
      field,
      label,
      labelIcon,
      Label,
      id: resolvedId,
    }),
    [props, field, label, labelIcon, Label, resolvedId]
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
    if (field.type === "custom") {
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
          <Children {...mergedProps} />
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
  const isFocused = useAppStore((s) => s.state.ui.field.focus === props.name);
  const { onChange } = props;

  const value = useAppStore((s) => {
    if (typeof props.value !== "undefined") return props.value;

    const { name, field } = props;

    if (!name) return;

    // Exclude array and object fields as they handle rendering independently
    const excludedFields = ["array", "object"];

    if (!excludedFields.includes(field.type)) {
      const rootProps = s.state.data.root.props || s.state.data.root;

      const props = s.selectedItem ? s.selectedItem.props : rootProps;

      if (props) {
        return getDeep(props, name);
      }
    }
  });

  const [localValue, setLocalValue] = useState(value);

  const onChangeLocal = useCallback(
    (val: any, ui?: Partial<UiState>) => {
      // Exclude array and object fields as they handle rendering independently
      const excludedFields = ["array", "object"];

      if (!excludedFields.includes(props.field.type)) {
        setLocalValue(val);
      }

      onChange(val, ui);
    },
    [props.field.type]
  );

  useEffect(() => {
    // Prevent global state from setting local state if this field is focused
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (!isFocused) {
      if (value !== localValue) {
        setLocalValue(value);
      }
    }
  }, [isFocused, value, localValue]);

  const localProps = useMemo(
    () => ({
      // localValue is sometimes undefined when using outside of Fields context
      value: localValue ?? value,
      onChange: onChangeLocal,
    }),
    [value, localValue, onChangeLocal]
  );

  return <AutoFieldInternal<ValueType, FieldType> {...props} {...localProps} />;
}

export function AutoField<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(props: FieldProps<FieldType, ValueType>) {
  const DefaultLabel = useMemo(() => {
    const DefaultLabel = (labelProps: any) => (
      <div
        {...labelProps}
        className={getClassName({ readOnly: props.readOnly })}
      />
    );

    return DefaultLabel;
  }, [props.readOnly]);

  if (props.field.type === "slot") {
    return null;
  }

  return (
    <AutoFieldInternal<ValueType, FieldType> {...props} Label={DefaultLabel} />
  );
}
