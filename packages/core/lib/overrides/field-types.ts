import { Overrides } from "../../types";

/**
 * Checks if a field type has been hidden via overrides.
 *
 * @param overrides The overrides object containing field type overrides.
 * @param fieldType The field type to check.
 * @returns True if the field type is hidden, false otherwise.
 */
export const isFieldTypeHidden = (
  overrides?: Overrides["fieldTypes"],
  fieldType?: string
) => {
  return fieldType ? overrides?.[fieldType] === null : false;
};
