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
