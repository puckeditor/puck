import { ChevronDown } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { Select } from "../../../Select";

export const SelectField = ({
  field,
  onChange,
  label,
  labelIcon,
  Label,
  value,
  name,
  readOnly,
  id,
}: FieldPropsInternal) => {
  if (field.type !== "select" || !field.options) {
    return null;
  }

  return (
    <Label
      label={label || name}
      icon={labelIcon || <ChevronDown size={16} />}
      readOnly={readOnly}
    >
      <Select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        options={field.options}
        placeholder={field.placeholder}
        disabled={readOnly}
        searchable={field.searchable}
        searchPlaceholder={field.searchPlaceholder}
      />
    </Label>
  );
};
