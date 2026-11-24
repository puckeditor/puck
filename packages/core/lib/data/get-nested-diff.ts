import { deepEqual } from "fast-equals";
import { isPlainObject } from "../is-plain-object";

type NestedDiff = Record<string, boolean>;

export const getNestedDiff = (
  obj1: Record<string, any> | undefined,
  obj2: Record<string, any> | undefined,
  path: string = ""
): NestedDiff => {
  const result: NestedDiff = {};

  // 1. Fast-path: Entire subtree/value is identical
  if (deepEqual(obj1, obj2)) {
    if (path !== "") {
      result[path] = false;
    }

    return result;
  }

  // 2. Both are arrays (and known to be unequal)
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);

    for (let i = 0; i < maxLen; i++) {
      const fullPath = path !== "" ? `${path}.[${i}]` : `[${i}]`;
      Object.assign(result, getNestedDiff(obj1[i], obj2[i], fullPath));
    }

    if (path !== "") {
      result[path] = true;
    }

    return result;
  }

  // 3. Both are plain objects (and known to be unequal)
  if (isPlainObject(obj1) && isPlainObject(obj2)) {
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of keys) {
      const fullPath = path !== "" ? `${path}.${key}` : key;
      Object.assign(result, getNestedDiff(obj1[key], obj2[key], fullPath));
    }

    if (path !== "") {
      result[path] = true;
    }

    return result;
  }

  // 4. Primitive change or type mismatch (e.g., string vs number, array vs object)
  if (path !== "") {
    result[path] = true;
  }

  return result;
};
