import { Field, Fields } from "@puckeditor/core";

/**
 * Gets a field definition from a field path, supporting nested fields in object and array types.
 *
 * @param fieldPath The dot-separated path to the field (e.g. "author.name", "items[0].name", "items[*].name")
 * @param fields The top-level fields to search through
 * @returns The field definition at the requested path, or undefined if not found
 */
export const getFieldAtPath = (
  fieldPath: string,
  fields: Fields
): Field | undefined => {
  const pathSegments = fieldPath
    .replace(/\[(\d+|\*)\]/g, ".__INDEX")
    .split(".");

  let currentFields = fields;
  let currentField: Field | undefined;

  for (const segment of pathSegments) {
    if (segment === "__INDEX") {
      if (currentField?.type !== "array") {
        return undefined;
      }
      continue;
    }

    currentField = currentFields?.[segment];

    if (!currentField) {
      return undefined;
    }

    if (currentField.type === "object" && currentField.objectFields) {
      currentFields = currentField.objectFields;
    }

    if (currentField.type === "array" && currentField.arrayFields) {
      currentFields = currentField.arrayFields;
    }
  }

  return currentField;
};
