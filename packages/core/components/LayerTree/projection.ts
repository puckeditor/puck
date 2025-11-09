import type { ZoneNode, ItemNode } from "./flatten";

/**
 * Projection module: Pure functions to compute drop targets from flattened tree
 * Following TDD design from 2025-11-03-outline-dnd-rewrite-tdd.md
 */

export type FlattenedItem = ZoneNode | ItemNode;

export interface Projection {
  parentZoneId: string | null; // Target ZoneNode id or null for root
  destinationZone: string; // Zone compound (e.g., "g1:items" or rootDroppableId)
  insertIndex: number; // 0..N, position within destination zone
  constrainedDepth: number; // Neighbor-based depth
  isReorder: boolean; // true if same parent zone, false for cross-zone move
  valid: boolean; // false for illegal moves (into own subtree, etc.)
}

type Position = "before" | "after" | "inside";

/**
 * Project a drop operation onto the flattened tree
 * Pure function: no side effects, no DOM access
 */
export function projectDrop(
  flattenedItems: FlattenedItem[],
  activeId: string,
  overId: string,
  position: Position,
  inputDepth?: number
): Projection {
  // Find active and over items
  const activeItem = flattenedItems.find((item) => item.itemId === activeId);
  const overItem = flattenedItems.find((item) => item.itemId === overId);

  if (!activeItem || !overItem) {
    return createInvalidProjection();
  }

  // Determine destination based on position
  let parentZoneId: string | null;
  let destinationZone: string;
  let insertIndex: number;
  let constrainedDepth: number;

  if (position === "inside") {
    // Dropping inside a ZoneNode
    if (overItem.kind !== "zone") {
      // Can't drop inside an item, treat as before
      return projectDrop(flattenedItems, activeId, overId, "before", inputDepth);
    }

    parentZoneId = overItem.itemId;
    destinationZone = overItem.zoneCompound;
    
    // Insert at beginning of zone's children
    const zoneChildren = flattenedItems.filter(
      (item) => item.parentId === parentZoneId
    );
    insertIndex = 0;
    constrainedDepth = overItem.depth + 1;
  } else {
    // Dropping before/after an item or ZoneNode
    
    // SPECIAL CASE: If overItem is a ZoneNode, use IT as the destination
    if (overItem.kind === "zone") {
      parentZoneId = overItem.itemId;
      destinationZone = overItem.zoneCompound;
      
      // Insert at beginning of zone if dropping "before", or end if "after"
      const zoneChildren = flattenedItems.filter(
        (item) => item.parentId === overItem.itemId && item.kind === "item"
      );
      
      insertIndex = position === "before" ? 0 : zoneChildren.length;
      constrainedDepth = overItem.depth + 1;
    } else {
      // OverItem is a regular component item
      
      // SPECIAL CASE: If dropping "after" a component that has child zones,
      // redirect to "inside" its first zone to avoid confusing UI
      if (position === "after" && overItem.hasChildren) {
        const firstChildZone = flattenedItems.find(
          (item) => item.kind === "zone" && item.parentId === overItem.itemId
        );
        if (firstChildZone && firstChildZone.kind === "zone") {
          // Redirect to inside the first zone
          return projectDrop(flattenedItems, activeId, firstChildZone.itemId, "inside", inputDepth);
        }
      }
      
      // Resolve to the parent ZoneNode
      const parentZone = flattenedItems.find(
        (item) => item.itemId === overItem.parentId
      );

      if (!parentZone) {
        return createInvalidProjection();
      }

      if (parentZone.kind !== "zone") {
        return createInvalidProjection();
      }

      parentZoneId = parentZone.itemId;
      destinationZone = parentZone.zoneCompound;

      // Calculate insertion index among siblings
      const siblings = flattenedItems.filter(
        (item) => item.parentId === parentZoneId && item.kind === "item"
      );
      
      const overIndex = siblings.findIndex((item) => item.itemId === overId);
      
      if (position === "before") {
        insertIndex = overIndex >= 0 ? overIndex : 0;
      } else {
        // "after"
        insertIndex = overIndex >= 0 ? overIndex + 1 : siblings.length;
      }

      // Clamp to valid range
      insertIndex = Math.max(0, Math.min(insertIndex, siblings.length));
      constrainedDepth = overItem.depth;
    }
  }

  // Determine if this is a reorder (same parent zone) or cross-zone move
  const activeParentZone = flattenedItems.find(
    (item) => item.itemId === activeItem.parentId
  );
  const isReorder = activeParentZone?.kind === "zone" &&
    activeParentZone.zoneCompound === destinationZone;

  // Validate: check for illegal reparenting into own subtree
  // parentZoneId should always be set at this point (either from zone or item branch)
  const valid = parentZoneId
    ? !isMovingIntoOwnSubtree(flattenedItems, activeId, parentZoneId)
    : false;

  return {
    parentZoneId,
    destinationZone,
    insertIndex,
    constrainedDepth,
    isReorder,
    valid,
  };
}

/**
 * Check if moving activeId into targetId would create a cycle
 * (i.e., moving a node into its own descendant)
 */
function isMovingIntoOwnSubtree(
  flattenedItems: FlattenedItem[],
  activeId: string,
  targetId: string
): boolean {
  if (activeId === targetId) {
    return false; // Dropping on self is allowed (no-op)
  }

  // Build a set of all descendants of activeId
  const descendants = new Set<string>();
  const queue = [activeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    // Find all children of current item
    const children = flattenedItems.filter(
      (item) => item.parentId === currentId
    );
    
    for (const child of children) {
      if (!descendants.has(child.itemId)) {
        descendants.add(child.itemId);
        queue.push(child.itemId);
      }
    }
  }

  // Check if target is a descendant (but not activeId itself)
  return descendants.has(targetId);
}

/**
 * Create an invalid projection result
 */
function createInvalidProjection(): Projection {
  return {
    parentZoneId: null,
    destinationZone: "",
    insertIndex: 0,
    constrainedDepth: 0,
    isReorder: false,
    valid: false,
  };
}