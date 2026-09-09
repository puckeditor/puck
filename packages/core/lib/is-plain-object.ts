/**
 * Checks if a value is a plain object (i.e., an object created by the Object constructor or with a null prototype).
 * @param val The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */
export const isPlainObject = (val: any): val is Record<string, any> => {
  if (typeof val !== "object" || val === null) return false;
  const prototype = Object.getPrototypeOf(val);
  return prototype === Object.prototype || prototype === null;
};
