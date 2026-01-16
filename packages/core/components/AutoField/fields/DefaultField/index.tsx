import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { Hash, Type } from "lucide-react";
import { FieldPropsInternal } from "../..";

import { useLocalValue } from "../../lib/use-local-value";

const getClassName = getClassNameFactory("Input", styles);

export const DefaultField = ({
  field,
  onChange,
  readOnly,
  id,
  name = id,
  label,
  labelIcon,
  Label,
}: FieldPropsInternal) => {
  const [localValue, onChangeLocal] = useLocalValue(name, onChange);

  return (
    <Label
      label={label || name}
      icon={
        labelIcon || (
          <>
            {field.type === "text" && <Type size={16} />}
            {field.type === "number" && <Hash size={16} />}
          </>
        )
      }
      readOnly={readOnly}
    >
      <input
        className={getClassName("input")}
        autoComplete="off"
        type={field.type}
        title={label || name}
        name={name}
        value={localValue}
        onChange={(e) => {
          if (field.type === "number") {
            const numberValue = Number(e.currentTarget.value);

            if (typeof field.min !== "undefined" && numberValue < field.min) {
              return;
            }

            if (typeof field.max !== "undefined" && numberValue > field.max) {
              return;
            }

            onChangeLocal(numberValue);
          } else {
            onChangeLocal(e.currentTarget.value);
          }
        }}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        id={id}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        placeholder={
          field.type === "text" || field.type === "number"
            ? field.placeholder
            : undefined
        }
        step={field.type === "number" ? field.step : undefined}
      />
    </Label>
  );
};
