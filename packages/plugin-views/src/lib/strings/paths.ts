export const PATH_INDEX_SEGMENT_REGEX = /(\[(?:\d+|\*)\])/g;

export const WILDCARD_INDEX_REGEX = /\[\*\]/g;

export const INDEX_REGEX = /\[(\d+|\*)\]/g;

/**
 * Splits a dot-notation path string into its individual segments.
 *
 * @param path The path string to split (e.g. `"items[*].name"`)
 * @returns The path segments (e.g. `["items", "[*]", "name"]`)
 */
export const getPathSegments = (path: string) =>
  path.replace(PATH_INDEX_SEGMENT_REGEX, ".$1").split(".").filter(Boolean);

/**
 * Joins path segments back into a dot-notation path string.
 *
 * @param pathSegments The segments to join
 * @returns The path string (e.g. `"items[*].name"`)
 */
export const getPathString = (pathSegments: string[]) =>
  pathSegments.join(".").replace(/\.\[/g, "[");

/**
 * Counts the number of wildcard indices (`[*]`) in a path string.
 *
 * @param value The path string to inspect
 * @returns The number of wildcards found
 */
export const getWildcardCount = (value: string) =>
  value.match(WILDCARD_INDEX_REGEX)?.length ?? 0;

/**
 * Builds a regex that matches a wildcard path against a concrete or wildcard-indexed path string.
 *
 * @example {
 *   const regex = getWildcardPathRegExp("items[*].name");
 *   regex.test("items[0].name"); // true
 *   regex.test("items[*].name"); // true
 *
 *   const regex2 = getWildcardPathRegExp("items[*].nested[0].nested[*].name");
 *   regex2.test("items[0].nested[0].nested[0].name"); // true
 *   regex2.test("items[*].nested[0].nested[1].name"); // true
 *
 *   regex2.test("items[0].nested[1].nested[1].name"); // false
 * }
 *
 * @param path The wildcard path to convert (e.g. `"items[*].name"`)
 * @param wildcardPattern The pattern to substitute for each `[*]`, defaults to `(\d+|*)`
 * @returns A regex anchored at the start of the path
 */
export const getWildcardPathRegExp = (
  path: string,
  wildcardPattern = "(\\d+|\\*)"
) =>
  new RegExp(
    `^${path
      .replace(/\./g, "\\.")
      .replace(/\[\*\]/g, `\\[${wildcardPattern}\\]`)
      .replace(/\[(\d+)\]/g, "\\[$1\\]")}(?=\\.|\\[|$)`
  );

/**
 * Returns true if the expression is a valid path expression.
 */
export const isValidPathExpression = (expression: string) =>
  /^[a-zA-Z0-9_-]+(?:\[(?:\d+|\*)\])*(?:\.(?:[a-zA-Z0-9_-]+(?:\[(?:\d+|\*)\])*))*$/.test(
    expression
  );

/**
 * Gets all the indexes from a path if it includes array indexing (e.g., "[0]" or "[*]"), otherwise returns an empty array.
 *
 * @param path The path to extract the indexes from.
 * @returns An array of extracted indexes as strings and their positions.
 */
export const getIndexesFromPath = (
  path: string
): { index: string; openingPosition: number; closingPosition: number }[] => {
  const match = path.matchAll(INDEX_REGEX);

  const matches: {
    index: string;
    openingPosition: number;
    closingPosition: number;
  }[] = [];

  for (const m of match) {
    matches.push({
      index: m[1],
      openingPosition: m.index ?? -1,
      closingPosition: (m.index ?? -1) + m[0].length - 1,
    });
  }

  return matches;
};

/**
 * Reads a nested value from a view result using dot and array notation.
 *
 * Note: When a wildcard is encountered the whole array at that level will be returned.
 *
 * @param value The value to read from
 * @param path The nested path to resolve
 * @returns The value at the requested path
 */
export const getValueAtPath = (value: any, path: string) => {
  if (!path) {
    return value;
  }

  const normalizedPath = path.replace(INDEX_REGEX, ".$1");

  const pathSegments = normalizedPath.split(".").filter(Boolean);

  let curr = value;

  for (const segment of pathSegments) {
    if (segment === "*") {
      return Array.isArray(curr) ? curr : undefined;
    }

    const valueAtSegment = curr?.[segment];

    if (typeof valueAtSegment === "undefined" || valueAtSegment === null) {
      return undefined;
    }

    curr = valueAtSegment;
  }

  return curr;
};

/**
 * Finds the closest ancestor path with a wildcard that matches the given full path.
 *
 * In other words it finds the closest array binding path for the full path.
 *
 * For example:
 * - fullPath: `items[0].subItems[1].names[2].label`
 * - potentialAncestors: [`items[*].subItems[1].names[*]`, `items[*].subItems[0].names[*].label`, `items[*]`]
 * - returns: `items[*].subItems[1].names[*]` as it is the closest ancestor path with a wildcard that matches the full path.
 *
 * @param fullPath The full path to match.
 * @param potentialAncestors An array of potential ancestor paths with wildcards.
 * @returns The closest matching ancestor path with a wildcard, or null if none found.
 */
export const getPathToClosestWildcard = (
  fullPath: string,
  potentialAncestors: string[]
): string | null => {
  const searchTermParts = fullPath.split(".");

  let deepestMatch: string[] = [];
  let currentMatch: string[] = [];

  // NB: This could be more performant with a trie if we have a lot of candidates
  // Paths are trees where each segment is an edge, and we want to find the closest ancestor,
  // so we can iterate through each candidate following the path defined by the full path and check how deep the match goes
  for (const candidate of potentialAncestors) {
    currentMatch = [];

    const lastWildCardIndex = candidate.lastIndexOf("[*]");
    if (lastWildCardIndex === -1) {
      continue;
    }

    const candidateToLastWildcard = candidate.substring(
      0,
      lastWildCardIndex + 3
    );

    const candidateParts = candidateToLastWildcard.split(".");

    for (let i = 0; i < searchTermParts.length; i++) {
      if (i >= candidateParts.length) {
        break;
      }

      const searchPartStatic = searchTermParts[i];
      const searchPartWildCard = searchPartStatic.replace(/\[\d+\]/g, "[*]");

      const candidatePart = candidateParts[i];

      if (
        candidatePart !== searchPartStatic &&
        candidatePart !== searchPartWildCard
      ) {
        break;
      }

      // If the candidate part matches either the static or wildcard version of the search part
      // this might lead to a valid match, so we add it to the current match and keep iterating
      currentMatch.push(candidatePart);

      // Wildcard parts are considered a terminal match
      if (
        candidatePart === searchPartWildCard &&
        candidatePart.includes("[*]")
      ) {
        if (currentMatch.length > deepestMatch.length) {
          deepestMatch = [...currentMatch];
        }
      }
    }
  }

  return deepestMatch.length > 0 ? deepestMatch.join(".") : null;
};

/**
 * Extracts the leading segment name from a path.
 *
 * Note: Assumes the path name can only contain alphanumeric characters, underscores, or dashes.
 *
 * @param path The path to inspect
 * @returns The first segment name, if one exists
 */
export const getFirstSegmentName = (path: string) => {
  const match = path.trim().match(/^[a-zA-Z0-9_-]+/);

  return match?.[0] || null;
};
