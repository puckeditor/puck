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

/**
 * The field types whose `fieldTypes` override is already rendering higher up the
 * tree.
 */
export type ActiveFieldTypeOverrides = Readonly<Record<string, boolean>>;

/**
 * Checks if a field type's override is already rendering higher up the tree.
 *
 * An override that renders an `<AutoField>` for its own field type resolves the
 * same override again, which renders another `<AutoField>`, and so on until the
 * stack is exhausted. Puck's own nested fields go through `AutoFieldPrivate`, so
 * only the public `<AutoField>` can re-enter an override this way.
 *
 * @param activeFieldTypeOverrides The field types whose override is rendering above.
 * @param fieldType The field type to check.
 * @returns True if rendering the override again would re-enter it, false otherwise.
 */
export const isFieldTypeOverrideActive = (
  activeFieldTypeOverrides?: ActiveFieldTypeOverrides,
  fieldType?: string
) => {
  return fieldType ? !!activeFieldTypeOverrides?.[fieldType] : false;
};
