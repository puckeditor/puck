import { Field, Overrides } from "../../types";

import { isFieldTypeHidden } from "../overrides/field-types";

/**
 * Checks if a field is visible based on its type, overrides, and visibility property.
 *
 * @param fieldTypeOverrides The field type overrides as received from `Puck`.
 * @param field The field object to check.
 * @returns `true` if the field is visible, `false` otherwise.
 */
export const isFieldVisible = (
  fieldTypeOverrides?: Overrides["fieldTypes"],
  field?: Field
): field is Field => {
  if (!field) return false;

  if (field.type === "slot") return false;

  if (isFieldTypeHidden(fieldTypeOverrides, field.type)) return false;

  return field.visible ?? true;
};
