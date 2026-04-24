/**
 * Deep clones an object using JSON serialization.
 * This is faster than structuredClone, but only works for JSON-serializable objects (i.e., it doesn't support functions, Dates, Maps, Sets, etc.).
 *
 * @param obj The object to clone
 * @returns The cloned object
 */
const cloneObject = <T extends Record<string, any>>(obj: T): T => {
  // This is faster than structuredClone for deep cloning the object,
  // but it only works if the object is JSON-serializable (i.e., it doesn't contain functions, Dates, Maps, Sets, etc.).
  // If we need to support non-JSON-serializable objects in the future, we might need to switch to a different deep cloning method.
  return JSON.parse(JSON.stringify(obj));
};

export default cloneObject;
