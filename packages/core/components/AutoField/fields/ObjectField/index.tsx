import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { MoreVertical } from "lucide-react";
import { AutoFieldPrivate, FieldPropsInternal } from "../..";
import { NestedFieldProvider, useNestedFieldContext } from "../../context";

const getClassName = getClassNameFactory("ObjectField", styles);

export const ObjectField = ({
  field,
  onChange,
  value,
  name,
  label,
  labelIcon,
  Label,
  readOnly,
  id,
}: FieldPropsInternal) => {
  const { readOnlyFields, localName = name } = useNestedFieldContext();

  if (field.type !== "object" || !field.objectFields) {
    return null;
  }

  const data = value || {};

  return (
    <Label
      label={label || name}
      icon={labelIcon || <MoreVertical size={16} />}
      el="div"
      readOnly={readOnly}
    >
      <div className={getClassName()}>
        <fieldset className={getClassName("fieldset")}>
          {Object.keys(field.objectFields!).map((subName) => {
            const subField = field.objectFields![subName];

            const subPath = `${name}.${subName}`;
            const localSubPath = `${localName || name}.${subName}`;

            const subReadOnly = readOnly
              ? readOnly
              : readOnlyFields[localSubPath];

            const label = subField.label || subName;

            return (
              <NestedFieldProvider
                key={subPath}
                name={localName || id}
                subName={subName}
                readOnlyFields={readOnlyFields}
              >
                <AutoFieldPrivate
                  name={subPath}
                  label={subPath}
                  id={`${id}_${subName}`}
                  readOnly={subReadOnly}
                  field={{
                    ...subField,
                    label, // May be used by custom fields
                  }}
                  value={data[subName]}
                  onChange={(val, ui) => {
                    onChange(
                      {
                        ...data,
                        [subName]: val,
                      },
                      ui
                    );
                  }}
                />
              </NestedFieldProvider>
            );
          })}
        </fieldset>
      </div>
    </Label>
  );
};
