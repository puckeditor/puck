import { MoreVertical } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useNestedFieldContext } from "../../context";
import { useAppStore } from "../../../../store";
import { getDeep } from "../../../../lib/data/get-deep";
import { SubField } from "../../subfield";
import { useFieldStoreApi } from "../../store";
import { FieldGroupInternal, FieldGroupItem } from "../../../FieldGroup";
import { isFieldVisible } from "../../../../lib/fields/is-field-visible";

export const ObjectField = ({
  field,
  onChange,
  id,
  name: fieldName,
  label,
  labelIcon,
  Label,
  readOnly,
}: FieldPropsInternal) => {
  const name = fieldName ?? id;

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

  // Don't show hidden subfields
  const subNames = Object.keys(field.objectFields).filter((subName) =>
    isFieldVisible(fieldTypeOverrides, field.objectFields![subName])
  );

  const labelProps = {
    label: label || fieldName,
    icon: labelIcon || <MoreVertical size={16} />,
    readOnly,
  };

  // The group renders nothing without content, but the label should stay
  if (subNames.length === 0) {
    return <Label {...labelProps} el="div" />;
  }

  return (
    <FieldGroupInternal {...labelProps} Label={Label} variant={field.variant}>
      {subNames.map((subName) => {
        const subField = field.objectFields![subName];
        const subPath = `${localName}.${subName}`;

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
    </FieldGroupInternal>
  );
};
