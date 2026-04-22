import { memo, ReactNode, useMemo } from "react";
import { AutoField, FieldLabel, ObjectField as PuckObjectField } from "@puckeditor/core";
import getClassNameFactory from "@/core/lib/get-class-name-factory";

import styles from "./style.module.css";

const getClassName = getClassNameFactory("ObjectField", styles);

export type ObjectFieldProps<Params extends Record<string, any>> = {
  name?: string;
  field: PuckObjectField<{ props: Params }>;
  value: Params;
  onChange: (nextParams: Params) => void;
  readOnly?: boolean;
};

/** Renders a Puck object field. Object fields don't set all nested fields as readOnly, so this component handles that */
const ObjectFieldInternal = <Params extends Record<string, any>>({
  name,
  field,
  value,
  onChange,
  readOnly,
}: ObjectFieldProps<Params>) => {
  const fields = useMemo(() => {
    const result: ReactNode[] = [];

    for (const key in field.objectFields) {
      const fieldForKey =
        field.objectFields[key as keyof typeof field.objectFields];
      const valueForKey = value[key];

      const fieldName = `${name ? name + "." : ""}${key}`;

      if (fieldForKey.type === "object") {
        result.push(
          <FieldLabel key={key} label={key}>
            <ObjectField
              name={fieldName}
              field={fieldForKey as PuckObjectField<typeof valueForKey>}
              value={valueForKey ?? {}}
              onChange={(nextValue) => {
                onChange({
                  ...value,
                  [key]: nextValue,
                });
              }}
            />
          </FieldLabel>
        );

        continue;
      }

      result.push(
        <FieldLabel key={fieldName} label={key}>
          <AutoField
            readOnly={readOnly}
            field={fieldForKey}
            onChange={(nextValue) => {
              onChange({
                ...(value as any),
                [key]: nextValue,
              });
            }}
            value={valueForKey}
          />
        </FieldLabel>
      );
    }

    return result;
  }, [field, value, onChange]);

  const objectFieldContent = <div className={getClassName()}>{fields}</div>;

  const label = field.label || name;

  return label ? (
    <FieldLabel label={label} el="div">
      {objectFieldContent}
    </FieldLabel>
  ) : (
    objectFieldContent
  );
};

const ObjectField = memo(ObjectFieldInternal);

export default ObjectField;
