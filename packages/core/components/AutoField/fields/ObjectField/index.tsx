import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { MoreVertical } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useNestedFieldContext } from "../../context";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { getDeep } from "../../../../lib/data/get-deep";
import { SubField } from "../../subfield";
import { useCallback } from "react";

const getClassName = getClassNameFactory("ObjectField", styles);

export const ObjectField = ({
  field,
  onChange,
  name,
  label,
  labelIcon,
  Label,
  readOnly,
  id,
  value,
}: FieldPropsInternal) => {
  const { localName = name } = useNestedFieldContext();

  const appStoreApi = useAppStoreApi();

  const canEdit = useAppStore(
    (s) => s.permissions.getPermissions({ item: s.selectedItem }).edit
  );

  const getValue = useCallback(() => {
    if (typeof value !== "undefined") return value;

    const { selectedItem } = appStoreApi.getState();
    const props = (name ? selectedItem?.props : {}) ?? {};

    return name ? getDeep(props, name) : {};
  }, [appStoreApi, name, value]);

  if (field.type !== "object" || !field.objectFields) {
    return null;
  }

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
            const subPath = `${localName}.${subName}`;

            return (
              <SubField
                key={subPath}
                id={`${id}_${subName}`}
                name={name}
                subName={subName}
                localName={localName}
                field={subField}
                forceReadOnly={!canEdit}
                value={value}
                onChange={(subValue, ui, subName) => {
                  const value = getValue();

                  onChange({ ...value, [subName]: subValue }, ui);
                }}
              />
            );
          })}
        </fieldset>
      </div>
    </Label>
  );
};
