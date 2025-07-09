import { useMemo } from "react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { CheckCircle } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { safeJsonParse } from "../../../../lib/safe-json-parse";

const getClassName = getClassNameFactory("Input", styles);

export const RadioField = ({
  field,
  onChange,
  readOnly,
  value,
  name,
  id,
  label,
  labelIcon,
  Label,
}: FieldPropsInternal) => {
  const flatOptions = useMemo(
    () =>
      field.type === "radio" ? field.options.map(({ value }) => value) : [],
    [field]
  );

  if (field.type !== "radio" || !field.options) {
    return null;
  }

  return (
    <Label
      icon={labelIcon || <CheckCircle size={16} />}
      label={label || name}
      readOnly={readOnly}
      el="div"
    >
      <div className={getClassName("radioGroupItems")} id={id}>
        {field.options.map((option) => (
          <label
            key={option.label + option.value}
            className={getClassName("radio")}
          >
            <input
              type="radio"
              className={getClassName("radioInput")}
              value={option.value as string | number}
              name={name}
              onChange={(e) => {
                const jsonValue =
                  safeJsonParse(e.target.value) ?? e.target.value;

                if (flatOptions.indexOf(jsonValue) > -1) {
                  onChange(jsonValue);
                } else {
                  onChange(e.target.value);
                }
              }}
              disabled={readOnly}
              checked={value === option.value}
            />
            <div className={getClassName("radioInner")}>
              {option.label || option.value}
            </div>
          </label>
        ))}
      </div>
    </Label>
  );
};
