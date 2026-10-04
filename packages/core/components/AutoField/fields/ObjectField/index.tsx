import { MoreVertical } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useNestedFieldContext } from "../../context";
import { useAppStore } from "../../../../store";
import { getDeep } from "../../../../lib/data/get-deep";
import { SubField } from "../../subfield";
import { useFieldStoreApi } from "../../store";
import { FieldGroup, FieldGroupItem } from "../../../FieldGroup";
import { isFieldVisible } from "../../../../lib/fields/is-field-visible";

export const ObjectField = ({
  field,
  onChange,
  id,
  name = id,
  label,
  labelIcon,
  Label,
  readOnly,
}: FieldPropsInternal) => {
  const { localName = name } = useNestedFieldContext();

  const fieldStore = useFieldStoreApi();

  const canEdit = useAppStore(
    (s) => s.permissions.getPermissions({ item: s.selectedItem }).edit
  );

  const fieldTypeOverrides = useAppStore((s) => s.overrides.fieldTypes);

  const getValue = () => getDeep(fieldStore.getState(), name) ?? {};

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
      <FieldGroup>
        {Object.keys(field.objectFields!).map((subName) => {
          const subField = field.objectFields![subName];
          const subPath = `${localName}.${subName}`;

          // Don't show hidden subfields
          if (!isFieldVisible(fieldTypeOverrides, subField)) return null;

          return (
            <FieldGroupItem key={subPath}>
              <SubField
                id={`${id}_${subName}`}
                name={name}
                subName={subName}
                localName={localName}
                field={subField}
                forceReadOnly={!canEdit}
                onChange={(subValue, ui, subName) => {
                  const value = getValue();

                  // Skip onChange if value hasn't changed
                  if (value[subName] === subValue) {
                    return;
                  }

                  onChange({ ...value, [subName]: subValue }, ui);
                }}
              />
            </FieldGroupItem>
          );
        })}
      </FieldGroup>
    </Label>
  );
};
