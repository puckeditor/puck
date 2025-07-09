import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "../../styles.module.css";
import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";

const getClassName = getClassNameFactory("Input", styles);

export const TextareaField = ({
  field,
  onChange,
  readOnly,
  value,
  name,
  label,
  labelIcon,
  Label,
  id,
}: FieldPropsInternal) => {
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
        value={typeof value === "undefined" ? "" : value}
        onChange={(e) => onChange(e.currentTarget.value)}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        rows={5}
        placeholder={field.type === "textarea" ? field.placeholder : undefined}
      />
    </Label>
  );
};
