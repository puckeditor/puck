import { SlotField } from "../../types";

/**
 * Checks whether a component type may be placed in a zone with the given
 * allow/disallow lists. An unset componentType is always accepted.
 */
export const isComponentAllowed = (
  componentType: string | null | undefined,
  { allow, disallow }: Pick<SlotField, "allow" | "disallow">
): boolean => {
  if (!componentType) {
    return true;
  }

  const allowed = new Set(allow);
  const disallowed = new Set(disallow);

  if (disallow) {
    // Always allow a component that is explicitly allowed, even if disallowed.
    if (disallowed.has(componentType) && allowed.has(componentType)) {
      disallowed.delete(componentType);
    }

    return !disallowed.has(componentType);
  } else if (allow) {
    // If allow is set, only allow components that are explicitly allowed.
    return allowed.has(componentType);
  }

  return true;
};
