import { useMemo } from "react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { ChevronDown } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { safeJsonParse } from "../../../../lib/safe-json-parse";

const getClassName = getClassNameFactory("Input", styles);

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
  const flatOptions = useMemo(
    () =>
      field.type === "select" ? field.options.map(({ value }) => value) : [],
    [field]
  );

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
          const jsonValue = safeJsonParse(e.target.value) ?? e.target.value;

          if (flatOptions.indexOf(jsonValue) > -1) {
            onChange(jsonValue);
          } else {
            onChange(e.target.value);
          }
        }}
        value={value}
      >
        {field.options.map((option) => (
          <option
            key={option.label + option.value}
            label={option.label}
            value={option.value as string | number}
          />
        ))}
      </select>
    </Label>
  );
};
