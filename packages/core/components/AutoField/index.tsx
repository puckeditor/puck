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
  CheckboxField,
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
import { setDeep } from "../../lib/data/set-deep";
import { isFieldVisible } from "../../lib/fields/is-field-visible";
import { rendersCollapsibleGroup } from "../../lib/fields/renders-collapsible-group";
import type {
  FieldLabelPropsInternal,
  FieldPropsInternalOptional,
} from "./FieldLabel";
import { FieldLabelInternal } from "./FieldLabel";
import { useFieldStoreApi, fieldContextStore } from "./store";
import { useLocalValue } from "./lib/use-local-value";
import { useExpandedFieldGroup } from "../FieldGroup";

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
  onToggle?: () => void;
  expanded?: boolean;
};

export { FieldLabel } from "./FieldLabel";

const defaultFields = {
  array: ArrayField,
  external: ExternalField,
  object: ObjectField,
  select: SelectField,
  textarea: TextareaField,
  radio: RadioField,
  checkbox: CheckboxField,
  text: DefaultField,
  number: DefaultField,
  richtext: RichtextField,
};

type AutoFieldInternalProps<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
> = FieldPropsInternalOptional<ValueType, FieldType> & {
  Label?: React.FC<FieldLabelPropsInternal>;
  trackFocus?: boolean;
} & Pick<FieldPropsInternal<ValueType, FieldType>, "expanded" | "onToggle">;

function AutoFieldInternal<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(props: AutoFieldInternalProps<ValueType, FieldType>) {
  const dispatch = useAppStore((s) => s.dispatch);
  const overrides = useAppStore((s) => s.overrides);
  const readOnly = useAppStore(useShallow((s) => s.selectedItem?.readOnly));
  const nestedFieldContext = useContext(NestedFieldContext);

  const { id, Label = FieldLabelInternal, trackFocus = true } = props;

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
      checkbox: overrides.fieldTypes?.checkbox || defaultFields.checkbox,
      text: overrides.fieldTypes?.text || defaultFields.text,
      number: overrides.fieldTypes?.number || defaultFields.number,
      richtext: overrides.fieldTypes?.richtext || defaultFields.richtext,
    }),
    [overrides]
  );

  // Custom fields and overridden field types are handed their value directly,
  // out of the field store. Built-in fields read it themselves.
  const readsValueFromStore =
    field.type === "custom" || !!overrides.fieldTypes?.[field.type];

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
        trackFocus &&
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
    [trackFocus, mergedProps.name]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent) => {
      if (trackFocus && "name" in e.target) {
        dispatch({
          type: "setUi",
          ui: {
            field: { focus: null },
          },
        });
      }
    },
    [trackFocus]
  );

  let Children = useMemo(() => {
    if (field.type !== "custom" && field.type !== "slot") {
      return defaultFields[field.type];
    }

    return (_props: any) => null;
  }, [field.type]);

  const fieldKey = field.type === "custom" ? field.key : undefined;

  let FieldComponent: React.ComponentType<any> | null | undefined =
    useMemo(() => {
      // if there's an override provided for custom fields, fallback to standard behavior
      if (field.type === "custom" && !render[field.type]) {
        if (!field.render) {
          return null;
        }
        return field.render;
      } else if (field.type !== "slot") {
        return render[field.type];
      }
    }, [field.type, fieldKey, render]);

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
      <div
        className={getClassNameWrapper()}
        data-puck-field-group-collapsible={
          rendersCollapsibleGroup(field, overrides.fieldTypes) || undefined
        }
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
  // Share expanded state per component type
  const fieldGroupKey = useAppStore(
    (s) => `${s.selectedItem?.type || "root"}.${props.name}`
  );

  const field = props.field as Field<ValueType>;

  const { expanded, toggleExpanded } = useExpandedFieldGroup({
    fieldGroupKey,
    defaultExpanded:
      field.type === "object" ? field.defaultExpanded : undefined,
  });

  const internalProps: AutoFieldInternalProps<ValueType, FieldType> = {
    ...props,
  };

  if (field.type === "object") {
    internalProps.expanded = expanded;
    internalProps.onToggle = toggleExpanded;
  }

  return <AutoFieldInternal<ValueType, FieldType> {...internalProps} />;
}

function AutoFieldPublicInternal<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>({
  value,
  name,
  ...props
}: FieldProps<FieldType, ValueType> & {
  value: any;
  id: string;
  name: string;
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

  const field = props.field as Field<ValueType>;

  const { expanded, toggleExpanded, unsetExpanded } = useExpandedFieldGroup({
    fieldGroupKey: props.id,
    defaultExpanded:
      field.type === "object" ? field.defaultExpanded : undefined,
  });

  // Unset the expanded state when the component is unmounted and no id is provided since `useSafeId` changes between mounts.
  // TODO: Remove when #1834 (https://github.com/puckeditor/puck/issues/1834) is fixed. Currently is impossible to pass an explicit id to the AutoField API.
  useEffect(() => {
    return () => unsetExpanded();
  }, [unsetExpanded, props.id]);

  const onChange = useCallback(
    (value: any) => {
      if (!name) return;

      fieldStore.setState({ [name]: value });

      props.onChange(value);
    },
    [fieldStore, props.onChange, name]
  );

  useEffect(() => {
    if (!name) return;

    fieldStore.setState({ [name]: value });
  }, [name, value, fieldStore]);

  const internalProps: AutoFieldInternalProps<ValueType, FieldType> = {
    ...props,
    name,
    onChange,
    Label: DefaultLabel,
    trackFocus: false,
  };

  if (props.field.type === "object") {
    internalProps.expanded = expanded;
    internalProps.onToggle = toggleExpanded;
  }

  return <AutoFieldInternal<ValueType, FieldType> {...internalProps} />;
}

// This map keeps track of active field IDs and their corresponding internal keys to prevent ID collisions across different instances of AutoField components.
const activeFieldIds = new Map<string, string>();

export function AutoField<
  ValueType = any,
  FieldType extends FieldNoLabel<ValueType> = FieldNoLabel<ValueType>
>(props: FieldProps<FieldType, ValueType> & { value: any }) {
  const defaultId = useSafeId();
  const internalKey = useSafeId();
  const selectedItemId = useAppStore((s) => s.selectedItem?.props.id);

  const isArray = props.field.type === "array";

  const candidateId = useMemo(() => {
    // If no ID is provided, use the default safe ID
    if (!props.id) {
      return defaultId;
    }

    // If the field is an array and a selected item ID exists, prefix the provided ID with the selected item ID to ensure uniqueness
    if (isArray && selectedItemId) {
      return `${selectedItemId}_${props.id}`;
    }

    // Otherwise, use the provided ID as is
    return props.id;
  }, [props.id, defaultId, isArray, selectedItemId]);

  const currentOwner = props.id ? activeFieldIds.get(candidateId) : undefined;
  const isColliding = props.id
    ? currentOwner !== undefined && currentOwner !== internalKey
    : false;

  // If a collision is detected, fall back to the default safe ID; otherwise, use the candidate ID
  const resolvedId = isColliding ? defaultId : candidateId;

  // If this instance is the first to claim the candidateId, register it in the activeFieldIds map
  if (props.id && !isColliding) {
    activeFieldIds.set(candidateId, internalKey);
  }

  useEffect(() => {
    if (isColliding) {
      console.warn(
        `Duplicate id "${props.id}" in AutoField. Falling back to generated ID.`
      );
    }
  }, [isColliding, props.id]);

  // Cleanup on unmount: if this instance owns the candidateId, remove it from the registry
  useEffect(() => {
    return () => {
      if (props.id && activeFieldIds.get(candidateId) === internalKey) {
        activeFieldIds.delete(candidateId);
      }
    };
  }, [props.id, candidateId, internalKey]);

  if (props.field.type === "slot") {
    return null;
  }

  return (
    <fieldContextStore.Provider value={{ [internalKey]: props.value }}>
      <AutoFieldPublicInternal<ValueType, FieldType>
        {...props}
        id={resolvedId}
        name={internalKey}
      />
    </fieldContextStore.Provider>
  );
}
