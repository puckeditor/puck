/**
 * Checks if a value is a plain object (i.e., an object created by the Object constructor or with a null prototype).
 * @param val The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */
const isPlainObject = (val: any): val is Record<string, any> => {
  if (typeof val !== "object" || val === null) return false;
  const prototype = Object.getPrototypeOf(val);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Gets the index from a path segment if it includes array indexing (e.g., "[0]" or "[*]"), otherwise returns null.
 * Validates that if the segment includes an opening bracket, it also includes a closing bracket, and vice versa.
 *
 * @param segment The path segment to extract the index from.
 * @returns The extracted index as a string, or null if the segment does not include array indexing.
 */
const getIndex = (segment: string): string | null => {
  const openingBracketIndex = segment.indexOf("[");
  const closingBracketIndex = segment.indexOf("]");

  const isIndexedString =
    openingBracketIndex !== -1 || closingBracketIndex !== -1;

  if (
    isIndexedString &&
    (openingBracketIndex !== 0 || closingBracketIndex !== segment.length - 1)
  ) {
    throw new Error(
      `The passed path isn't valid (${segment}): Array indexing doesn't have matching brackets ([]).`
    );
  }

  return isIndexedString ? segment.slice(1, -1) : null;
};

/**
 * Gets the next level of the object/array based on the next segment in the path.
 *
 * If the next level value is undefined, null, or not an object, it initializes it as an empty object or array depending on whether the next segment indicates an array index.
 * @param nextLevelValue The value at the next level of the object/array.
 * @param nextSegment The next segment in the path, used to determine whether to initialize an array or object if the next level value is not suitable for cloning.
 * @param nextIsLastSegment Indicates whether the next segment is the last segment in the path.
 *
 * @returns The next level value, or a new object/array if the next level value is not suitable for cloning.
 */
const getNextLevel = (
  nextLevelValue: any,
  nextSegment: string | undefined
): any => {
  if (
    nextLevelValue === undefined ||
    nextLevelValue === null ||
    (!isPlainObject(nextLevelValue) && !Array.isArray(nextLevelValue))
  ) {
    return nextSegment?.startsWith("[") ? [] : {};
  } else {
    return nextLevelValue;
  }
};

const recursiveSetDeep = (
  obj: Record<string, any> | Record<string, any>[],
  pathSegments: string[],
  currentIndex: number,
  value: any
): void => {
  const segment = pathSegments[currentIndex];

  const index = getIndex(segment);

  const isLastSegment = currentIndex === pathSegments.length - 1;

  // This means the obj is an array, and the segment is trying to access an index of the array
  if (index !== null) {
    if (obj !== undefined && !Array.isArray(obj)) {
      throw new Error(
        `The value passed is not valid (${JSON.stringify(
          value,
          undefined,
          2
        )}): Array indexing only works on array values.`
      );
    }

    // Handle wildcard indexing: we need to set the value for all items in the array at this level
    if (index === "*") {
      if (!Array.isArray(value)) {
        return;
      }

      if (isLastSegment) {
        obj.length = value.length;
      }

      for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
        if (isLastSegment) {
          obj[valueIndex] = value[valueIndex] || {};

          continue;
        } else {
          obj[valueIndex] = getNextLevel(
            obj[valueIndex],
            pathSegments[currentIndex + 1]
          );

          recursiveSetDeep(
            obj[valueIndex],
            pathSegments,
            currentIndex + 1,
            value
          );
        }
      }

      return;
    }

    const numericIndex = Number(index);

    if (
      isNaN(numericIndex) ||
      numericIndex < 0 ||
      !Number.isInteger(numericIndex) ||
      numericIndex >= obj.length
    ) {
      throw new Error(
        `The path passed isn't valid (${segment}): Array indexing only works with non-negative integers or wildcards.`
      );
    }

    if (isLastSegment) {
      obj[numericIndex] = value;
      return;
    }

    obj[numericIndex] = getNextLevel(
      obj[numericIndex],
      pathSegments[currentIndex + 1]
    );

    return recursiveSetDeep(
      obj[numericIndex],
      pathSegments,
      currentIndex + 1,
      value
    );
  } else if (!Array.isArray(obj)) {
    if (isLastSegment) {
      obj[segment] = value;
      return;
    }

    obj[segment] = getNextLevel(obj[segment], pathSegments[currentIndex + 1]);

    return recursiveSetDeep(
      obj[segment],
      pathSegments,
      currentIndex + 1,
      value
    );
  }
};

/**
 * Sets a value in an object at the specified path.
 * The path can include array indexing using square brackets (e.g., "a.b[0].c" or "a.b[*].c").
 *
 * @param obj The object to update.
 * @param path The path to the value to set.
 * @param value The value to set at the specified path.
 * @returns The updated object. This function mutates the original object, but also returns it for convenience.
 */
const setDeep = (
  obj: Record<string, any>,
  path: string,
  value: any
): Record<string, any> => {
  const pathSegments = path
    .replace(/\[(\d+|\*)\]/g, ".[$1]")
    .split(".")
    .filter(Boolean);

  recursiveSetDeep(obj, pathSegments, 0, value);

  return obj;
};

export default setDeep;
