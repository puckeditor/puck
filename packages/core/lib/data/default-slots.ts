import { Fields } from "../../types";

export const defaultSlots = (value: object, fields: Fields) =>
  Object.keys(fields).reduce(
    (acc, fieldName) =>
      fields[fieldName].type === "slot" ? { [fieldName]: [], ...acc } : acc,
    value
  );
