/**
 * Helper function to set a value based on a dot-notated path
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
    // Separate the “prop” piece and an optional “[index]” part.
    const [prop, idxStr] = parts[i].replace("]", "").split("[");
    const isLast = i === parts.length - 1;

    if (idxStr !== undefined) {
      if (!Array.isArray(cur[prop])) {
        cur[prop] = [];
      }

      const idx = Number(idxStr);

      if (isLast) {
        // We’ve reached the leaf → assign.
        cur[prop][idx] = newVal;
        continue;
      }

      // Ensure the next level container exists.
      if (cur[prop][idx] === undefined) cur[prop][idx] = {};

      cur = cur[prop][idx];

      continue;
    }

    if (isLast) {
      cur[prop] = newVal;
      continue;
    }

    if (cur[prop] === undefined) {
      cur[prop] = {};
    }

    cur = cur[prop];
  }

  return { ...node, ...newNode };
}
