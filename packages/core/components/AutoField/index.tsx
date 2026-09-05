import getClassNameFactory from "../../lib/get-class-name-factory";
import { Field, FieldProps, UiState } from "../../types";

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
import { ActiveFieldTypeOverridesContext, NestedFieldContext } from "./context";
import { useShallow } from "zustand/react/shallow";
import { setDeep } from "../../lib/data/set-deep";
import { isFieldVisible } from "../../lib/fields/is-field-visible";
import { isFieldTypeOverrideActive } from "../../lib/overrides/field-types";
import type {
  FieldLabelPropsInternal,
  FieldPropsInternalOptional,
} from "./FieldLabel";
import { FieldLabelInternal } from "./FieldLabel";
import { useFieldStoreApi, fieldContextStore } from "./store";
import { useLocalValue } from "./lib/use-local-value";

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
>({
  // Stripped from the props handed to field components: this is Puck's own
  // bookkeeping, not part of the public field API.
  bypassFieldTypeOverride = false,
  ...props
}: FieldPropsInternalOptional<ValueType, FieldType> & {
  Label?: React.FC<FieldLabelPropsInternal>;
  bypassFieldTypeOverride?: boolean;
}) {
  const dispatch = useAppStore((s) => s.dispatch);
  const overrides = useAppStore((s) => s.overrides);
  const readOnly = useAppStore(useShallow((s) => s.selectedItem?.readOnly));
  const nestedFieldContext = useContext(NestedFieldContext);
  const activeFieldTypeOverrides = useContext(ActiveFieldTypeOverridesContext);

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

  // Whether this field is actually rendered by a `fieldTypes` override. False
  // when the override is being bypassed to avoid re-entering itself, in which
  // case this behaves exactly like a field with no override at all.
  const rendersOverride =
    !!overrides.fieldTypes?.[field.type] && !bypassFieldTypeOverride;

  // Custom fields and overridden field types are handed their value directly,
  // out of the field store. Built-in fields read it themselves.
  const readsValueFromStore = field.type === "custom" || rendersOverride;

  const fieldPath = props.name ?? resolvedId;

  const fieldStore = useFieldStoreApi();

  const onChangeWithStoreSync = useMemo(() => {
    if (!readsValueFromStore) {
      return props.onChange;
    }

    return (value: any, uiState?: Partial<UiState>) => {
      // Call the parent first, so nested (object/array) fields compute their
      // update against the pre-change store value.
      props.onChange?.(value, uiState);

      // Race condition mitigation:
      // Object and array fields build their update by merging the changed
      // subfield over its siblings, which they read out of this store.
      // The store is only written after resolving data asynchronously, so without
      // this sync write, editing two siblings within objects/arrays in quick succession could make the
      // second merge carry the first sibling's pre-change value and undo it.
      fieldStore.setState(setDeep(fieldStore.getState(), fieldPath, value));
    };
  }, [readsValueFromStore, props.onChange, fieldPath, fieldStore]);

  // Same local tracking the built-in fields use, so custom and overridden fields get their
  // new value on the same render to avoid caret jumps and resolved data overriding the new value.
  const [fieldValue, onChange] = useLocalValue(
    fieldPath,
    onChangeWithStoreSync,
    { tracked: readsValueFromStore }
  );

  const mergedProps = useMemo(
    () => ({
      ...props,
      field,
      label,
      labelIcon,
      Label,
      id: resolvedId,
      value: fieldValue,
      onChange,
    }),
    [props, field, label, labelIcon, Label, resolvedId, fieldValue, onChange]
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

  // Mark this field type as overridden for everything the override renders, so a
  // public `<AutoField>` of the same type inside it doesn't resolve the override
  // again. Unchanged by reference when nothing is being overridden here, so
  // fields that aren't overridden pay nothing for this.
  const childActiveFieldTypeOverrides = useMemo(
    () =>
      rendersOverride
        ? { ...activeFieldTypeOverrides, [field.type]: true }
        : activeFieldTypeOverrides,
    [rendersOverride, activeFieldTypeOverrides, field.type]
  );

  let FieldComponent: React.ComponentType<any> | null | undefined =
    useMemo(() => {
      // if there's an override provided for custom fields, fallback to standard behavior
      if (
        field.type === "custom" &&
        (!render[field.type] || bypassFieldTypeOverride)
      ) {
        if (!field.render) {
          return null;
        }
        return field.render;
      } else if (field.type !== "slot") {
        return bypassFieldTypeOverride
          ? defaultFields[field.type as keyof typeof defaultFields]
          : render[field.type];
      }
    }, [field.type, fieldKey, render, bypassFieldTypeOverride]);

  if (!isFieldVisible(overrides.fieldTypes, field)) {
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
      <ActiveFieldTypeOverridesContext.Provider
        value={childActiveFieldTypeOverrides}
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
      </ActiveFieldTypeOverridesContext.Provider>
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
>({
  value,
  bypassFieldTypeOverride,
  ...props
}: FieldProps<FieldType, ValueType> & {
  value: any;
  bypassFieldTypeOverride?: boolean;
}) {
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
      bypassFieldTypeOverride={bypassFieldTypeOverride}
    />
  );
}

export function AutoField<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(props: FieldProps<FieldType, ValueType> & { value: any }) {
  const id = useSafeId();
  const activeFieldTypeOverrides = useContext(ActiveFieldTypeOverridesContext);

  if (props.field.type === "slot") {
    return null;
  }

  // A `fieldTypes` override that renders an `<AutoField>` for its own field type
  // would resolve that same override again and recurse until the stack is
  // exhausted. Inside an override's own subtree, render the built-in field for
  // that type instead. Only this public entry point can re-enter an override —
  // the default node an override receives as `children`, and every field Puck
  // nests itself, go through `AutoFieldPrivate`.
  const bypassFieldTypeOverride = isFieldTypeOverrideActive(
    activeFieldTypeOverrides,
    props.field.type
  );

  return (
    <fieldContextStore.Provider value={{ [id]: props.value }}>
      <AutoFieldPublicInternal<ValueType, FieldType>
        {...props}
        id={id}
        bypassFieldTypeOverride={bypassFieldTypeOverride}
      />
    </fieldContextStore.Provider>
  );
}
