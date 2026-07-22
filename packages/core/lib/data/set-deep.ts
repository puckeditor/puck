import { isPlainObject } from "../is-plain-object";

const copyContainer = (value: any) =>
  Array.isArray(value) ? [...value] : isPlainObject(value) ? { ...value } : {};

/**
 * Helper function to set a value based on a dot-notated path.
 *
 * Copies every level along the assignment path (leaving all other
 * references untouched), so shared structures such as history
 * snapshots are never mutated in place.
 */
export function setDeep<T extends Record<string, any>>(
  node: T,
  path: string,
  newVal: any
): T {
  const parts = path.split(".");
  const newNode = { ...node };

  let cur: Record<string, any> = newNode;

  for (let i = 0; i < parts.length; i++) {
    // Separate the “prop” piece and an optional “[index]” part (e.g. "myArr[0]" -> ["myArr", "0"]).
    const [prop, idxStr] = parts[i].replace("]", "").split("[");
    const isLast = i === parts.length - 1;

    // If it has an index, treat it as an array
    if (idxStr !== undefined) {
      cur[prop] = Array.isArray(cur[prop]) ? [...cur[prop]] : [];
      const idx = Number(idxStr);

      if (isLast) {
        // We’ve reached the leaf → assign.
        cur[prop][idx] = newVal;
        continue;
      }

      cur[prop][idx] = copyContainer(cur[prop][idx]);

      cur = cur[prop][idx];

      continue;
    }

    if (isLast) {
      // We’ve reached the leaf → assign.
      cur[prop] = newVal;
      continue;
    }

    // Otherwise, treat it as an object.
    cur[prop] = copyContainer(cur[prop]);

    cur = cur[prop];
  }

  return newNode;
}
