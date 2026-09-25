import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { SquareCheck } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useDeepField } from "../../lib/use-deep-field";

const getClassName = getClassNameFactory("Input", styles);

export const CheckboxField = ({
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

  if (field.type !== "checkbox" || !field.options) {
    return null;
  }

  const selected: unknown[] = Array.isArray(value) ? value : [];

  return (
    <Label
      icon={labelIcon || <SquareCheck size={16} />}
      label={label || name}
      readOnly={readOnly}
      el="div"
    >
      <div className={getClassName("checkboxGroupItems")} id={id}>
        {field.options.map((option) => (
          <label
            key={option.label + JSON.stringify(option.value)}
            className={getClassName("checkbox")}
          >
            <input
              type="checkbox"
              className={getClassName("checkboxInput")}
              onChange={(e) => {
                // Keep the value ordered by options, regardless of click order
                onChange(
                  field.options
                    .filter((o) =>
                      o.value === option.value
                        ? e.target.checked
                        : selected.includes(o.value)
                    )
                    .map((o) => o.value)
                );
              }}
              disabled={readOnly}
              checked={selected.includes(option.value)}
            />
            <span>{option.label || option.value?.toString()}</span>
          </label>
        ))}
      </div>
    </Label>
  );
};
