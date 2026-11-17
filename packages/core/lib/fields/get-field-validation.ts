import { Field, FieldValidation } from "../../types";

/**
 * Runs a field's `validate` function against a value and normalizes the result.
 *
 * @param field The field object to validate against.
 * @param value The current value of the field.
 * @returns The validation message to show, or `null` if there is nothing to report.
 */
export const getFieldValidation = (
  field: Pick<Field, "validate"> | undefined,
  value: unknown
): FieldValidation | null => {
  if (typeof field?.validate !== "function") return null;

  const result = field.validate(value);

  if (!result) return null;

  if (typeof result === "string") {
    return { type: "error", message: result };
  }

  if (!result.message) return null;

  return { type: result.type ?? "error", message: result.message };
};
