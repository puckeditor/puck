import { Field, Overrides } from "../../types";
import { isFieldVisible } from "./is-field-visible";

/**
 * Checks if a field renders as just a collapsible group: a collapsible object field
 * rendered by Puck (not a `fieldTypes` override) with at least one visible subfield.
 *
 * @param field The field to check.
 * @param fieldTypeOverrides The field type overrides as received from `Puck`.
 * @returns `true` if the field renders as just a collapsible group, `false` otherwise.
 */
export const rendersCollapsibleGroup = (
  field: Field,
  fieldTypeOverrides?: Overrides["fieldTypes"]
) =>
  field.type === "object" &&
  !!field.collapsible &&
  !fieldTypeOverrides?.object &&
  Object.values(field.objectFields ?? {}).some((subField) =>
    isFieldVisible(fieldTypeOverrides, subField)
  );
