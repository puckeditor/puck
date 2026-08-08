export type LayerZone = {
  /** The child nodes of this zone (nested components). */
  items: LayerNode[];
  /** The label of the zone. Used to display in the layer tree (zone name). */
  label?: string;
  /** The compound identifier of the zone as used by puck ({componentId}:{zoneId}). */
  zoneCompound: string;
};

/**
 * A node in the layer tree, representing a single component and its child zones.
 */
export type LayerNode = {
  /** The child zones of this node. */
  childZones: LayerZone[];
  /** The type of the component represented by this node (from ComponentData). */
  componentType: string;
  /** The index of this node within its parent zone. */
  index: number;
  /** The unique identifier of the component (from ComponentData). */
  itemId: string;
  /** The label of the component. Used to display in the layer tree. */
  label: string;
  /** The compound identifier of the zone containing this node as used by puck ({componentId}:{zoneId}). */
  zoneCompound: string;
  /** When true, the component is not visible in the rendered output but remains in the document structure. */
  hidden: boolean;
};
