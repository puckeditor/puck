import { Config, SlotField } from "../../types";
import { NodeIndex, ZoneIndex } from "../../types/Internal";
import { getSlotField } from "./get-slot-field";

export type ZoneConstraints = Pick<SlotField, "allow" | "disallow">;

const NO_CONSTRAINTS: ZoneConstraints = {};

/**
 * Gets a zone's allow/disallow constraints from the config and its zone compound.
 *
 * NB: This only works with slot zones, since those are the only ones that define
 * constraints in the config; legacy DropZone zones resolve as unconstrained,
 * since their allow/disallow only exist as render props inside the canvas and
 * can't be read for unmounted zones.
 *
 * @returns The zone's allow/disallow constraints, or an empty object if the zone is unconstrained.
 */
export const getZoneConstraints = (
  zoneCompound: string,
  config: Config,
  indexes: { nodes: NodeIndex; zones: ZoneIndex }
): ZoneConstraints => {
  if (indexes.zones[zoneCompound]?.type !== "slot") {
    return NO_CONSTRAINTS;
  }

  const field = getSlotField(zoneCompound, config, indexes.nodes);

  if (field?.type !== "slot") {
    return NO_CONSTRAINTS;
  }

  return { allow: field.allow, disallow: field.disallow };
};
