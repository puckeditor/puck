import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { useLocalValue } from "../../lib/use-local-value";

const getClassName = getClassNameFactory("Input", styles);

export const TextareaField = ({
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
      icon={labelIcon || <Type size={16} />}
      readOnly={readOnly}
    >
      <textarea
        id={id}
        className={getClassName("input")}
        autoComplete="off"
        name={name}
        value={typeof localValue === "undefined" ? "" : localValue}
        onChange={(e) => onChangeLocal(e.currentTarget.value)}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        rows={5}
        placeholder={field.type === "textarea" ? field.placeholder : undefined}
      />
    </Label>
  );
};
