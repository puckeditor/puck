import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { ChevronDown } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useDeepField } from "../../lib/use-deep-field";

const getClassName = getClassNameFactory("Input", styles);

export const SelectField = ({
  field,
  onChange,
  label,
  labelIcon,
  Label,
  id,
  name = id,
  readOnly,
}: FieldPropsInternal) => {
  const value = useDeepField(name);

  if (field.type !== "select" || !field.options) {
    return null;
  }

  return (
    <Label
      label={label || name}
      icon={labelIcon || <ChevronDown size={16} />}
      readOnly={readOnly}
    >
      <select
        id={id}
        title={label || name}
        className={getClassName("input")}
        disabled={readOnly}
        onChange={(e) => {
          onChange(JSON.parse(e.target.value).value);
        }}
        value={JSON.stringify({ value })}
      >
        {field.options.map((option) => (
          <option
            key={option.label + JSON.stringify(option.value)}
            label={option.label}
            value={JSON.stringify({ value: option.value })}
          />
        ))}
      </select>
    </Label>
  );
};
