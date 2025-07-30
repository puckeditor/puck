import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { MoreVertical } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useNestedFieldContext } from "../../context";
import { useAppStoreApi } from "../../../../store";
import { getDeep } from "../../../../lib/data/get-deep";
import { SubField } from "../../subfield";

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
}: FieldPropsInternal) => {
  const { localName = name } = useNestedFieldContext();

  const appStoreApi = useAppStoreApi();

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
                onChange={(subValue, ui, subName) => {
                  const { selectedItem } = appStoreApi.getState();

                  if (selectedItem && name) {
                    const data = getDeep(selectedItem.props, name);

                    onChange({ ...data, [subName]: subValue }, ui);
                  }
                }}
              />
            );
          })}
        </fieldset>
      </div>
    </Label>
  );
};
