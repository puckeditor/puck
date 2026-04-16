export const INDEX_REGEX = /\[(\d+|\*)\]/g;

/**
 * Gets all the indexes from a path if it includes array indexing (e.g., "[0]" or "[*]"), otherwise returns an empty array.
 *
 * @param path The path to extract the indexes from.
 * @returns An array of extracted indexes as strings and their positions.
 */
const getIndexesFromPath = (
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

export default getIndexesFromPath;
