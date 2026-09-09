import { getDeep } from "../../../lib/data/get-deep";
import { useFieldStore } from "../store";

/**
 * Read a value out of the field store by dot-notated path.
 *
 * Pass `enabled: false` to opt out: the selector then returns a stable
 * `undefined`, so the caller doesn't re-render when the value changes.
 */
export const useDeepField = (path: string, enabled: boolean = true) => {
  return useFieldStore((s) => (enabled ? getDeep(s, path) : undefined));
};
