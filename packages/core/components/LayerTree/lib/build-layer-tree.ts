import { Config } from "../../../types";
import { NodeIndex, ZoneIndex } from "../../../types/Internal";
import { getSlotField } from "../../../lib/data/get-slot-field";
import { LayerNode, LayerZone } from "../types";

const getZonesByParent = (zones: ZoneIndex): Record<string, string[]> => {
  const result: Record<string, string[]> = {};

  Object.keys(zones).forEach((zone) => {
    const [parentId] = zone.split(":");

    if (!parentId) return;

    if (!result[parentId]) result[parentId] = [];

    result[parentId].push(zone);
  });

  return result;
};

const getZoneLabel = (
  zoneCompound: string,
  nodes: NodeIndex,
  config: Config,
  label?: string
) => {
  if (label !== undefined) {
    return label;
  }

  const [, slotId] = zoneCompound.split(":");

  if (!slotId) {
    return;
  }

  return getSlotField(zoneCompound, config, nodes)?.label ?? slotId;
};

const buildLayerNode = ({
  config,
  itemId,
  index,
  nodes,
  zoneCompound,
  zones,
  zonesByParent,
  componentFallbackLabel,
}: {
  config: Config;
  itemId: string;
  index: number;
  nodes: NodeIndex;
  zoneCompound: string;
  zones: ZoneIndex;
  zonesByParent: Record<string, string[]>;
  componentFallbackLabel?: string;
}): LayerNode => {
  const nodeData = nodes[itemId];
  const componentType =
    nodeData?.data.type?.toString() ?? componentFallbackLabel;
  const label = config.components[componentType]?.label ?? componentType;
  const childZoneCompounds = zonesByParent[itemId] || [];

  return {
    childZones: childZoneCompounds.map((childZoneCompound) =>
      buildLayerTree({
        config,
        nodes,
        zoneCompound: childZoneCompound,
        zones,
        zonesByParent,
      })
    ),
    componentType,
    index,
    itemId,
    label,
    zoneCompound,
  };
};

export interface BuildLayerTreeProps {
  /** The Puck config object */
  config: Config;
  /** The label for the zone, if any */
  label?: string;
  /** The object with all the Puck nodes (from the app store) */
  nodes: NodeIndex;
  /** The compound zone identifier ({parent component id}:{slot/dropzone name}) */
  zoneCompound: string;
  /** The object with all the Puck zones (from the app store) */
  zones: ZoneIndex;
  /** The object mapping parent IDs to their child zone compounds */
  zonesByParent?: Record<string, string[]>;
  /** The fallback label for the component */
  componentFallbackLabel?: string;
}

/**
 * Recursively builds a layer tree for the given zone and all its child zones and nodes.
 */
export const buildLayerTree = ({
  config,
  label,
  nodes,
  zoneCompound,
  zones,
  zonesByParent = getZonesByParent(zones),
  componentFallbackLabel,
}: BuildLayerTreeProps): LayerZone => {
  const contentIds = zones[zoneCompound]?.contentIds ?? [];

  return {
    items: contentIds.map((itemId, index) =>
      buildLayerNode({
        config,
        itemId,
        index,
        nodes,
        zoneCompound,
        zones,
        zonesByParent,
      })
    ),
    label: getZoneLabel(zoneCompound, nodes, config, label),
    zoneCompound,
  };
};
