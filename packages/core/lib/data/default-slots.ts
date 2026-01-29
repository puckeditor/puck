import { Fields } from "../../types";

export const defaultSlots = (value: object, fields: Fields) =>
  Object.keys(fields).reduce(
    (acc, fieldName) =>
      fields[fieldName].type === "slot"
        ? { ...acc, [fieldName]: Array.isArray((acc as Record<string, unknown>)[fieldName]) ? (acc as Record<string,
            unknown>)[fieldName] : [] }
        : acc,
    value
  );
