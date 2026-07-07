type PossibleRef<T> =
  | { current: T | null }
  | ((instance: T | null) => void)
  | null
  | undefined;

/**
 * Combine multiple refs (object refs and/or callback refs) into a single
 * callback ref. Used to point both the shim's own host-element ref and
 * `puck.dragRef` (dnd-kit's ref callback) at the same `<div>`.
 */
export const composeRefs = <T>(...refs: PossibleRef<T>[]) => {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object" && "current" in ref) {
        ref.current = node;
      }
    });
  };
};
