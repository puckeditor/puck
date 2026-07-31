import { ZoneIndex } from "../../types/Internal";

/**
 * Checks if a component has any slots by looking for zones that start with the component's ID.
 *
 * @param componentId The ID of the component to check for slots.
 * @param indexes The zone index to check within.
 * @returns `true` if the component has any slots, `false` otherwise.
 */
export function componentDataHasSlots(
  componentId: string,
  indexes: ZoneIndex
): boolean {
  return Object.keys(indexes).some((zoneCompound) =>
    zoneCompound.startsWith(`${componentId}:`)
  );
}
