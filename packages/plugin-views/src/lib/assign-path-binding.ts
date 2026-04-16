import { isPlainObject } from "./utils/is-plain-object";
import getIndexesFromPath from "./utils/string-paths/get-indexes-from-path";

/**
 * Gets the index from a path segment if it includes array indexing (e.g., "[0]" or "[*]"), otherwise returns null.
 * Validates that if the segment includes an opening bracket, it also includes a closing bracket, and vice versa.
 *
 * @param segment The path segment to extract the index from.
 * @returns The extracted index as a string, or null if the segment does not include array indexing.
 */
const getIndex = (segment: string): string | null => {
  const match = getIndexesFromPath(segment)[0];

  if (!match || !match.index) {
    const openingBracketIndex = segment.indexOf("[");
    const closingBracketIndex = segment.indexOf("]");

    const isIndexedString =
      openingBracketIndex !== -1 || closingBracketIndex !== -1;

    const hasMatchingBrackets =
      openingBracketIndex !== -1 &&
      closingBracketIndex !== -1 &&
      openingBracketIndex < closingBracketIndex;

    if (isIndexedString && !hasMatchingBrackets) {
      throw new Error(
        `One of the paths isn't valid (${segment}): Array indexing doesn't have matching brackets ([]).`
      );
    }

    return null;
  }

  return match.index;
};

/**
 * Gets the next level of the object/array based on the next segment in the path.
 *
 * If the next level value is undefined, null, or not an object/array,
 * it initializes it as an empty object or array depending on whether the next segment indicates an array index.
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

const recursivePathAssignment = <
  Boundee extends object | any[],
  BoundValue extends object | any[],
  BoundeeItem = any,
  BoundValueItem = any,
  ReturnType = void
>(
  boundeeValue: Boundee,
  boundeePathSegments: string[],
  boundeeCurrentIndex: number,
  boundValue: BoundValue,
  boundValuePathSegments: string[],
  boundValueCurrentIndex: number,
  onArrayAssignment: OnArrayAssignment<BoundeeItem, BoundValueItem, ReturnType>
): void => {
  if (boundValueCurrentIndex >= boundValuePathSegments.length) {
    throw new Error("Overflowed the bound value path");
  }

  if (boundeeCurrentIndex >= boundeePathSegments.length) {
    throw new Error("Overflowed the boundee path");
  }

  const boundeeSegment = boundeePathSegments[boundeeCurrentIndex];
  const boundValueSegment = boundValuePathSegments[boundValueCurrentIndex];

  const boundeePathIndex = getIndex(boundeeSegment);
  const boundValuePathIndex = getIndex(boundValueSegment);

  const isBoundeeWildcard = boundeePathIndex === "*";
  const isBoundValueWildcard = boundValuePathIndex === "*";

  const boundeeIndexNumber = boundeePathIndex ? Number(boundeePathIndex) : null;
  const boundValueIndexNumber = boundValuePathIndex
    ? Number(boundValuePathIndex)
    : null;

  const isLastBoundeeSegment =
    boundeeCurrentIndex === boundeePathSegments.length - 1;
  const isLastBoundValueSegment =
    boundValueCurrentIndex === boundValuePathSegments.length - 1;

  if (boundValuePathIndex !== null && !Array.isArray(boundValue)) {
    throw new Error(
      `Bound value needs to be an array when using indexing in its path, received: ${JSON.stringify(
        boundValue,
        null,
        2
      )}`
    );
  }

  if (boundeePathIndex !== null && !Array.isArray(boundeeValue)) {
    throw new Error(
      `Boundee needs to be an array when using indexing in its path, received: ${JSON.stringify(
        boundeeValue,
        null,
        2
      )}`
    );
  }

  // Base case: if we're at the end of both paths, assign the value from the bound value to the boundee
  if (isLastBoundeeSegment && isLastBoundValueSegment) {
    if (isBoundeeWildcard !== isBoundValueWildcard) {
      throw new Error(
        "Cannot assign value: one path has a wildcard at the last segment but the other doesn't."
      );
    }

    // Array assignment, iterate through bound array and call onArrayAssignment
    if (isBoundeeWildcard && isBoundValueWildcard) {
      if (!Array.isArray(boundeeValue) || !Array.isArray(boundValue)) {
        throw new Error(
          "Both boundee and bound value need to be arrays when using wildcard indexing."
        );
      }

      boundeeValue.length = boundValue.length;

      boundValue.forEach((_, index) => {
        boundeeValue[index] = onArrayAssignment(
          {
            value: boundeeValue[index],
            pathSegments: boundeePathSegments,
          },
          {
            value: boundValue[index],
            pathSegments: boundValuePathSegments,
          }
        );
      });

      return;
    }

    // Both sides have an index, assign the value at the corresponding index
    if (boundeeIndexNumber !== null && boundValueIndexNumber !== null) {
      const boundeeArray = boundeeValue as any[];
      const boundValueArray = boundValue as any[];

      boundeeArray[boundeeIndexNumber] = boundValueArray[boundValueIndexNumber];

      return;
    }

    // Boundee has an index but the bound value doesn't, assign the value from the bound value to the corresponding index in the boundee
    if (boundeeIndexNumber !== null && boundValueIndexNumber === null) {
      const boundeeArray = boundeeValue as any[];
      const boundValueObject = boundValue as Record<string, any>;

      boundeeArray[boundeeIndexNumber] = boundValueObject[boundValueSegment];

      return;
    }

    // Bound value has an index but the boundee doesn't, assign the value from the corresponding index in the bound value to the boundee
    if (boundeeIndexNumber === null && boundValueIndexNumber !== null) {
      const boundeeObject = boundeeValue as Record<string, any>;
      const boundValueArray = boundValue as any[];

      boundeeObject[boundeeSegment] = boundValueArray[boundValueIndexNumber];

      return;
    }

    const boundeeObject = boundeeValue as Record<string, any>;
    const boundValueObject = boundValue as Record<string, any>;
    // Neither side has an index, assign the value from the bound value to the boundee using the segment as the key
    boundeeObject[boundeeSegment] = boundValueObject[boundValueSegment];

    return;
  }

  // One side has a wildcard and the other doesn't, search for the corresponding index in the other path
  if (isBoundValueWildcard && !isBoundeeWildcard) {
    const nextBoundeeSegmentIndex = boundeeCurrentIndex + 1;

    if (nextBoundeeSegmentIndex >= boundeePathSegments.length) {
      throw new Error(
        "There're more wildcards in the bound value path than in the boundee path, cannot resolve paths correctly."
      );
    }

    const nextLevelBoundeeValue = getNextLevel(
      boundeeIndexNumber !== null
        ? (boundeeValue as any[])[boundeeIndexNumber]
        : (boundeeValue as Record<string, any>)[boundeeSegment],
      boundeePathSegments[nextBoundeeSegmentIndex]
    );

    if (boundeeIndexNumber !== null) {
      (boundeeValue as any[])[boundeeIndexNumber] = nextLevelBoundeeValue;
    } else {
      (boundeeValue as Record<string, any>)[boundeeSegment] =
        nextLevelBoundeeValue;
    }

    recursivePathAssignment(
      nextLevelBoundeeValue,
      boundeePathSegments,
      nextBoundeeSegmentIndex,
      boundValue,
      boundValuePathSegments,
      boundValueCurrentIndex,
      onArrayAssignment
    );
    return;
  } else if (!isBoundValueWildcard && isBoundeeWildcard) {
    const nextBoundValueSegmentIndex = boundValueCurrentIndex + 1;

    if (nextBoundValueSegmentIndex >= boundValuePathSegments.length) {
      throw new Error(
        "There're more wildcards in the boundee path than in the bound value path, cannot resolve paths correctly."
      );
    }

    const nextLevelBoundValue = getNextLevel(
      boundValueIndexNumber !== null
        ? (boundValue as any[])[boundValueIndexNumber]
        : (boundValue as Record<string, any>)[boundValueSegment],
      boundValuePathSegments[nextBoundValueSegmentIndex]
    );

    recursivePathAssignment(
      boundeeValue,
      boundeePathSegments,
      boundeeCurrentIndex,
      nextLevelBoundValue,
      boundValuePathSegments,
      nextBoundValueSegmentIndex,
      onArrayAssignment
    );
    return;
  } else if (isBoundValueWildcard && isBoundeeWildcard) {
    // Both sides have a wildcard, we need to iterate through all items in both arrays at this level and continue the recursion for each combination of items
    const nextBoundeeSegmentIndex = boundeeCurrentIndex + 1;
    const nextBoundValueSegmentIndex = boundValueCurrentIndex + 1;

    if (!Array.isArray(boundeeValue) || !Array.isArray(boundValue)) {
      throw new Error(
        "Both boundee and bound value need to be arrays when using wildcard indexing."
      );
    }

    boundeeValue.length = boundValue.length;

    boundValue.forEach((_, index) => {
      const nextLevelBoundeeValue = getNextLevel(
        boundeeValue[index],
        boundeePathSegments[nextBoundeeSegmentIndex]
      );

      boundeeValue[index] = nextLevelBoundeeValue;

      const nextLevelBoundValue = getNextLevel(
        boundValue[index],
        boundValuePathSegments[nextBoundValueSegmentIndex]
      );

      recursivePathAssignment(
        nextLevelBoundeeValue,
        boundeePathSegments,
        nextBoundeeSegmentIndex,
        nextLevelBoundValue,
        boundValuePathSegments,
        nextBoundValueSegmentIndex,
        onArrayAssignment
      );
    });

    return;
  } else {
    // Neither side has a wildcard, we can continue the recursion by going to the next level in both paths using the current segment as the key/index
    const nextLevelBoundeeValue = isLastBoundeeSegment
      ? boundeeValue // We are at the last segment of the boundee path, only go to the next level for the bound value
      : getNextLevel(
          boundeeIndexNumber !== null
            ? (boundeeValue as any[])[boundeeIndexNumber]
            : (boundeeValue as Record<string, any>)[boundeeSegment],
          boundeePathSegments[boundeeCurrentIndex + 1]
        );

    if (boundeeIndexNumber !== null) {
      (boundeeValue as any[])[boundeeIndexNumber] = nextLevelBoundeeValue;
    } else {
      (boundeeValue as Record<string, any>)[boundeeSegment] =
        nextLevelBoundeeValue;
    }

    const nextLevelBoundValue = isLastBoundValueSegment
      ? boundValue // We are at the last segment of the bound value path, only go to the next level for the boundee
      : getNextLevel(
          boundValueIndexNumber !== null
            ? (boundValue as any[])[boundValueIndexNumber]
            : (boundValue as Record<string, any>)[boundValueSegment],
          boundValuePathSegments[boundValueCurrentIndex + 1]
        );

    recursivePathAssignment(
      nextLevelBoundeeValue,
      boundeePathSegments,
      isLastBoundeeSegment ? boundeeCurrentIndex : boundeeCurrentIndex + 1,
      nextLevelBoundValue,
      boundValuePathSegments,
      isLastBoundValueSegment
        ? boundValueCurrentIndex
        : boundValueCurrentIndex + 1,
      onArrayAssignment
    );
    return;
  }
};

export type PathContainer = Record<string, any> | any[];

type PathValuePair<Value> = {
  value: Value;
  pathSegments: string[];
};

type OnArrayAssignment<
  BoundeeItem = any,
  BoundValueItem = any,
  AssignedItem = BoundeeItem
> = (
  boundeeItem: PathValuePair<BoundeeItem | undefined>,
  boundValueItem: PathValuePair<BoundValueItem>
) => AssignedItem;

/**
 * Assigns the value from the boundValue to the boundee based on their paths.
 * The function resolves the paths of both the boundee and the bound value, and then assigns the value from the boundValue to the corresponding location in the boundee.
 *
 * It can handle static indexing (e.g., "field[0]") as well as dynamic wildcard indexing (e.g., "field[*]") in the paths.
 * If using wildcard indexing, the boundValue also needs to have as many wildcards in its path as the boundee for the function to correctly resolve the paths and perform the assignment.
 *
 * This happens in place and mutates the boundee object/array. The function handles both object and array structures, and it will create intermediate objects/arrays if they do not exist along the path.
 *
 * @param boundee Value that should receive the assigned value from the boundValue based on the resolved paths.
 * @param boundValue Value that should be assigned to the boundee based on the resolved paths.
 * @param onArrayAssignment Callback function that gets called for every item when an assignment is made for whole arrays. It receives the boundee item and the bound value item being assigned, along with their respective path segments.
 */
const assignPathBinding = <
  Boundee extends PathContainer,
  BoundValue extends PathContainer,
  BoundeeItem = any,
  BoundValueItem = any,
  AssignedItem = BoundeeItem
>(
  boundee: PathValuePair<Boundee>,
  boundValue: PathValuePair<BoundValue>,
  onArrayAssignment: OnArrayAssignment<
    BoundeeItem,
    BoundValueItem,
    AssignedItem
  >
) => {
  recursivePathAssignment(
    boundee.value,
    boundee.pathSegments,
    0,
    boundValue.value,
    boundValue.pathSegments,
    0,
    onArrayAssignment
  );
};

export default assignPathBinding;
