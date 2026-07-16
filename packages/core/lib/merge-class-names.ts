/**
 * Merges multiple class names into a single string, filtering out any undefined or falsy values.
 * @param classNames The class names to merge.
 * @returns A single string containing all the truthy class names separated by spaces.
 */
const mergeClassNames = (...classNames: (string | undefined)[]) =>
  [...classNames].filter(Boolean).join(" ");

export default mergeClassNames;
