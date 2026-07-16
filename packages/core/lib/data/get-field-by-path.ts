import { Field, Fields } from "../../types";

/**
 * Gets a field definition by string path (e.g. "array[0].object.title" returns the field for title).
 *
 * @throws If the path is not a string
 * @returns The field defined for the give path, or undefined if none is found
 */
export function getFieldByPath(
  path: string,
  fields?: Fields
): Field | undefined {
  if (typeof path !== "string") {
    throw new Error(
      `Can't get field definition for path (${path}): Path should be a string`
    );
  }

  if (!fields || typeof fields !== "object") {
    return undefined;
  }

  const segments = path.split(/\.|\[\d+\]/).filter(Boolean);
  let currFields = fields;
  let currField: Field | undefined = undefined;

  for (let index = 0; index < segments.length; index++) {
    const currSegment = segments[index];
    currField = currFields[currSegment];

    // Last segment, return the field
    if (index === segments.length - 1) {
      return currField;
    }

    // If the current field is not an object or array, we can't go deeper
    if (!currField) {
      return;
    }

    if (
      (currField.type !== "object" || !currField.objectFields) &&
      (currField.type !== "array" || !currField.arrayFields)
    )
      return;

    if (currField.type === "object") {
      currFields = currField.objectFields;
    }

    if (currField.type === "array") {
      currFields = currField.arrayFields;
    }
  }
}
