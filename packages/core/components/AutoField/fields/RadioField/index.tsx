import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { CheckCircle } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useDeepField } from "../../lib/use-deep-field";

const getClassName = getClassNameFactory("Input", styles);

export const RadioField = ({
  field,
  onChange,
  readOnly,
  id,
  name = id,
  label,
  labelIcon,
  Label,
}: FieldPropsInternal) => {
  const value = useDeepField(name);

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
              value={JSON.stringify({ value: option.value })}
              name={name}
              onChange={(e) => {
                onChange(JSON.parse(e.target.value).value);
              }}
              disabled={readOnly}
              checked={value === option.value}
            />
            <div className={getClassName("radioInner")}>
              {option.label || option.value?.toString()}
            </div>
          </label>
        ))}
      </div>
    </Label>
  );
};
