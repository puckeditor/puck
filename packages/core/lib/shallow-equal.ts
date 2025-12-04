/**
 * Does a shallow equality check between two objects, ignoring specified keys.
 * @returns true if the objects are shallowly equal (excluding ignored keys), false otherwise.
 */
export function shallowEqual(
  obj1: any,
  obj2: any,
  keysToIgnore: readonly string[] = []
): boolean {
  // Quick reference/value check
  if (Object.is(obj1, obj2)) return true;

  // Check for null and non-objects
  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return false;
  }

  // Guard against non-POJO false positives (e.g., Date, RegExp)
  if (Object.getPrototypeOf(obj1) !== Object.getPrototypeOf(obj2)) {
    return false;
  }

  const ignore = new Set(keysToIgnore);

  const keys1 = Object.keys(obj1).filter((k) => !ignore.has(k));
  const keys2 = Object.keys(obj2).filter((k) => !ignore.has(k));

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    const currKey = keys1[i];

    // Check if obj2 has the key
    if (!Object.prototype.hasOwnProperty.call(obj2, currKey)) return false;

    // Check if values are the same
    const val1 = obj1[currKey];
    const val2 = obj2[currKey];
    if (!Object.is(val1, val2)) return false;
  }

  return true;
}
