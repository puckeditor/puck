import type { PrivateAppState } from "../types/Internal";

/**
 * Reads a zone's content ids from the app-state indexes, defaulting to an empty
 * array when the zone hasn't been indexed yet.
 *
 * @param state - The puck app state to read from with the index.
 * @param zoneCompound - The compound id of the zone to read content ids for (e.g. "MySlot-123:body").
 * @returns The content ids of the zone, or an empty array if the zone hasn't been indexed yet.
 */
export const getZoneContentIds = (
  state: PrivateAppState,
  zoneCompound: string
): string[] => state.indexes.zones[zoneCompound]?.contentIds ?? [];
