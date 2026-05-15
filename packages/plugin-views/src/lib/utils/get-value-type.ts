import { ValueType } from "../../types";

/**
 * Determines the serializable type of a value.
 *
 * @param value The value to classify
 * @returns The inferred value type
 */
const getValueType = (value: any): ValueType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "unknown";
  }
};

export default getValueType;
