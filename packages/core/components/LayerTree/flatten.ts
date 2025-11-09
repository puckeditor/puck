import { findZonesForArea } from "../../lib/data/find-zones-for-area";
import type { PrivateAppState, PuckNodeData } from "../../types/Internal";

export type UniqueIdentifier = string | number;

/**
 * ZoneNode: Synthetic node representing a named zone (e.g., "items", "content")
 * These nodes act as drop targets and explicit parents in the outline tree.
 */
export interface ZoneNode {
  kind: "zone";
  itemId: string; // Synthetic id: ${componentId}::zone::${zoneName}
  zoneCompound: string; // The actual zone compound (e.g., "g1:items")
  parentId: string | null; // Parent component id
  depth: number; // Parent component depth + 1
  hasChildren: boolean; // Whether zone has content
  isExpanded: boolean; // UI expansion state
}

/**
 * ItemNode: Actual component node in the tree
 */
export interface ItemNode {
  kind: "item";
  itemId: string;
  zoneCompound: string;
  parentId: string | null; // Parent ZoneNode id
  depth: number;
  index: number;
  hasChildren: boolean;
  isExpanded: boolean;
  nodeData: PuckNodeData;
}

export type FlattenedPuckItem = ZoneNode | ItemNode;

/**
 * Generate synthetic ZoneNode id from component id and zone name
 * Convention: ${componentId}::zone::${zoneName}
 * This ensures no collision with real item ids
 */
export function generateZoneNodeId(componentId: string, zoneName: string): string {
  return `${componentId}::zone::${zoneName}`;
}

/**
 * Extract zone name from zone compound (e.g., "g1:items" -> "items")
 */
function getZoneNameFromCompound(zoneCompound: string): string {
  const parts = zoneCompound.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Extract component id from zone compound (e.g., "g1:items" -> "g1")
 */
function getComponentIdFromCompound(zoneCompound: string): string {
  return zoneCompound.split(":")[0];
}

/**
 * Flatten Puck's zone structure into a single array for rendering
 * Emits ZoneNodes for each zone, followed by their content items
 */
export function flattenPuckZones(
  state: PrivateAppState,
  expandedItems: Set<string>,
  selectedItemId?: string
): FlattenedPuckItem[] {
  const result: FlattenedPuckItem[] = [];
  const rootZones = findZonesForArea(state, "root");

  // Process each root zone
  for (const zoneCompound of rootZones) {
    const componentId = getComponentIdFromCompound(zoneCompound);
    const zoneName = getZoneNameFromCompound(zoneCompound);
    const zoneNodeId = generateZoneNodeId(componentId, zoneName);
    const zone = state.indexes.zones[zoneCompound];

    if (!zone) continue;

    // Emit synthetic ZoneNode for this zone
    const hasChildren = (zone.contentIds || []).length > 0;
    const hasSelectedChild = checkIfZoneHasSelectedChild(
      state,
      zoneCompound,
      selectedItemId
    );
    const isExpanded = expandedItems.has(zoneNodeId) || hasSelectedChild || hasChildren;

    result.push({
      kind: "zone",
      itemId: zoneNodeId,
      zoneCompound,
      parentId: null, // Root zones have no parent
      depth: 0,
      hasChildren,
      isExpanded,
    });

    // Flatten zone contents if expanded
    if (isExpanded) {
      flattenZone(
        state,
        zoneCompound,
        zoneNodeId, // ZoneNode is the parent
        1, // depth (children of root ZoneNode)
        result,
        expandedItems,
        selectedItemId
      );
    }
  }

  return result;
}

function flattenZone(
  state: PrivateAppState,
  zoneCompound: string,
  parentZoneNodeId: string | null,
  depth: number,
  result: FlattenedPuckItem[],
  expandedItems: Set<string>,
  selectedItemId?: string
): void {
  const zone = state.indexes.zones[zoneCompound];
  if (!zone) return;

  const contentIds = zone.contentIds || [];

  for (let i = 0; i < contentIds.length; i++) {
    const itemId = contentIds[i];
    const nodeData = state.indexes.nodes[itemId];
    if (!nodeData) continue;

    // Check if item has children (zones)
    const childZones = Object.keys(state.indexes.zones).filter((z) =>
      z.startsWith(`${itemId}:`)
    );
    const hasChildren = childZones.length > 0;

    // Determine if expanded
    const isSelected = itemId === selectedItemId;
    const hasSelectedChild = checkIfHasSelectedChild(
      state,
      itemId,
      selectedItemId
    );
    const isExpanded =
      expandedItems.has(itemId) || isSelected || hasSelectedChild;

    // Emit item node
    result.push({
      kind: "item",
      itemId,
      zoneCompound,
      parentId: parentZoneNodeId, // Parent is the ZoneNode
      depth,
      index: i,
      hasChildren,
      isExpanded,
      nodeData,
    });

    // ALWAYS emit child ZoneNodes when parent component is expanded
    // This ensures empty zones are visible as drop targets
    if (isExpanded) {
      for (const childZone of childZones) {
        const zoneName = getZoneNameFromCompound(childZone);
        const zoneNodeId = generateZoneNodeId(itemId, zoneName);
        const childZoneData = state.indexes.zones[childZone];

        if (!childZoneData) continue;

        // Emit ZoneNode for child zone (even if empty)
        const zoneHasChildren = (childZoneData.contentIds || []).length > 0;
        const zoneHasSelectedChild = checkIfZoneHasSelectedChild(
          state,
          childZone,
          selectedItemId
        );
        const zoneIsExpanded =
          expandedItems.has(zoneNodeId) || zoneHasSelectedChild || zoneHasChildren;

        result.push({
          kind: "zone",
          itemId: zoneNodeId,
          zoneCompound: childZone,
          parentId: itemId, // Parent is the component
          depth: depth + 1,
          hasChildren: zoneHasChildren,
          isExpanded: zoneIsExpanded,
        });

        // Only recursively flatten if zone has content AND is expanded
        if (zoneIsExpanded && zoneHasChildren) {
          flattenZone(
            state,
            childZone,
            zoneNodeId, // ZoneNode is the parent for its contents
            depth + 2, // Next level down
            result,
            expandedItems,
            selectedItemId
          );
        }
      }
    }
  }
}

function checkIfHasSelectedChild(
  state: PrivateAppState,
  itemId: string,
  selectedItemId?: string
): boolean {
  if (!selectedItemId) return false;

  const selectedNode = state.indexes.nodes[selectedItemId];
  if (!selectedNode) return false;

  return selectedNode.path.some((pathItem: string) => {
    const [candidateId] = pathItem.split(":");
    return candidateId === itemId;
  });
}

/**
 * Check if a zone contains the selected item (directly or in descendants)
 */
function checkIfZoneHasSelectedChild(
  state: PrivateAppState,
  zoneCompound: string,
  selectedItemId?: string
): boolean {
  if (!selectedItemId) return false;

  const selectedNode = state.indexes.nodes[selectedItemId];
  if (!selectedNode) return false;

  // Check if zone is in the selected item's path
  return selectedNode.path.includes(zoneCompound);
}

/**
 * Remove children of specified items from flattened list
 * Used to hide children of collapsed items and the dragged item
 */
export function removeChildrenOf(
  items: FlattenedPuckItem[],
  ids: UniqueIdentifier[]
): FlattenedPuckItem[] {
  const excludeParentIds = new Set(ids);

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.has(item.parentId)) {
      // If this item has children, also exclude their children
      if (item.hasChildren) {
        excludeParentIds.add(item.itemId);
      }
      return false;
    }

    return true;
  });
}

/**
 * Get IDs of all collapsed items
 * Note: Only returns items that are ACTUALLY collapsed (isExpanded: false)
 * This respects auto-expansion from selected children
 */
export function getCollapsedItems(
  items: FlattenedPuckItem[]
): UniqueIdentifier[] {
  return items
    .filter((item) => item.hasChildren && !item.isExpanded)
    .map((item) => item.itemId);
}