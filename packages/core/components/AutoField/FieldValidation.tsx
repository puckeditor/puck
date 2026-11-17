import getClassNameFactory from "../../lib/get-class-name-factory";
import { getFieldValidation } from "../../lib/fields/get-field-validation";
import { Field } from "../../types";

import styles from "./styles.module.css";
import { useDeepField } from "./lib/use-deep-field";

const getClassName = getClassNameFactory("InputValidation", styles);

/**
 * Shows the message returned by a field's `validate` function, if any.
 *
 * Reads the value out of the field store, and only subscribes to it when the
 * field defines `validate`, so fields without validation never re-render.
 */
export const FieldValidationMessage = ({
  field,
  path,
}: {
  field: Field;
  path: string;
}) => {
  const hasValidation = typeof field.validate === "function";

  const value = useDeepField(path, hasValidation);

  if (!hasValidation) return null;

  const validation = getFieldValidation(field, value);

  if (!validation) return null;

  return (
    <div
      className={getClassName({ [validation.type]: true })}
      data-puck-field-validation={validation.type}
      role={validation.type === "error" ? "alert" : "status"}
    >
      {validation.message}
    </div>
  );
};
