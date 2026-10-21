import { Field, Overrides } from "../../types";
import { isFieldVisible } from "./is-field-visible";

/**
 * Checks if a field renders as just an expandable group: an expandable object field
 * rendered by Puck (not a `fieldTypes` override) with at least one visible subfield.
 *
 * @param field The field to check.
 * @param fieldTypeOverrides The field type overrides as received from `Puck`.
 * @returns `true` if the field renders as just an expandable group, `false` otherwise.
 */
export const rendersExpandableGroup = (
  field: Field,
  fieldTypeOverrides?: Overrides["fieldTypes"]
) =>
  field.type === "object" &&
  !!field.expandable &&
  !fieldTypeOverrides?.object &&
  Object.values(field.objectFields ?? {}).some((subField) =>
    isFieldVisible(fieldTypeOverrides, subField)
  );
