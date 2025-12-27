import { projectDrop } from "../projection";
import type { FlattenedItem } from "../projection";

/**
 * Preview computation tests - simulates the logic that should be in handleDragOver
 * Tests fail-first approach: these demonstrate the correct behavior before implementing the fix
 */
describe("Preview computation using Projection", () => {
  const buildFlatItem = (
    itemId: string,
    kind: "zone" | "item",
    parentId: string | null,
    depth: number,
    zoneCompound: string,
    index: number = 0,
    hasChildren = false
  ): FlattenedItem => {
    if (kind === "zone") {
      return {
        kind: "zone",
        itemId,
        zoneCompound,
        parentId,
        depth,
        hasChildren,
        isExpanded: true,
      };
    } else {
      return {
        kind: "item",
        itemId,
        zoneCompound,
        parentId,
        depth,
        hasChildren,
        isExpanded: true,
        index,
        nodeData: {} as any,
      };
    }
  };

  /**
   * Pure helper that computes preview state using Projection
   * This is the KISS implementation that handleDragOver should use
   */
  function computePreview(
    flattenedItems: FlattenedItem[],
    activeId: string,
    overId: string,
    position: "before" | "after" | "inside"
  ): FlattenedItem[] {
    const projection = projectDrop(flattenedItems, activeId, overId, position);
    
    if (!projection || !projection.valid) {
      return flattenedItems;
    }

    const sourceIdx = flattenedItems.findIndex((i) => i.itemId === activeId);
    if (sourceIdx === -1) return flattenedItems;

    // Find all siblings under the destination parent
    const siblingIndices: number[] = [];
    for (let i = 0; i < flattenedItems.length; i++) {
      const item = flattenedItems[i];
      if (item.parentId === projection.parentZoneId && item.kind === "item") {
        siblingIndices.push(i);
      }
    }

    // Compute absolute insert index in the flat array
    let absoluteInsertIdx: number;
    
    if (siblingIndices.length === 0) {
      // No siblings - insert right after the parent ZoneNode
      const parentIdx = flattenedItems.findIndex(
        (i) => i.itemId === projection.parentZoneId
      );
      absoluteInsertIdx = parentIdx + 1;
    } else if (projection.insertIndex < siblingIndices.length) {
      // Insert before the sibling at insertIndex
      absoluteInsertIdx = siblingIndices[projection.insertIndex];
    } else {
      // Insert at end - after last sibling
      absoluteInsertIdx = siblingIndices[siblingIndices.length - 1] + 1;
    }

    // Remove the item from its current position
    const newItems = [...flattenedItems];
    const [movedItem] = newItems.splice(sourceIdx, 1);

    // Adjust insertion index if source was before target (classic splice rule)
    if (sourceIdx < absoluteInsertIdx) {
      absoluteInsertIdx--;
    }

    // Insert at new position with updated metadata
    newItems.splice(absoluteInsertIdx, 0, {
      ...movedItem,
      parentId: projection.parentZoneId,
      depth: projection.constrainedDepth,
    });

    return newItems;
  }

  describe("Same-zone reorder", () => {
    it("should correctly reorder item to end (off-by-one regression test)", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content", 1),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content", 2),
      ];

      const preview = computePreview(flat, "a", "c", "after");

      // Expect order: [zone, b, c, a]
      const itemIds = preview.filter((i) => i.kind === "item").map((i) => i.itemId);
      expect(itemIds).toEqual(["b", "c", "a"]);
      
      // Verify a's metadata is preserved
      const aInPreview = preview.find((i) => i.itemId === "a");
      expect(aInPreview?.parentId).toBe("root::zone::content");
      expect(aInPreview?.depth).toBe(1);
    });

    it("should correctly reorder item before another", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content", 1),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content", 2),
      ];

      const preview = computePreview(flat, "c", "a", "before");

      // Expect order: [zone, c, a, b]
      const itemIds = preview.filter((i) => i.kind === "item").map((i) => i.itemId);
      expect(itemIds).toEqual(["c", "a", "b"]);
    });
  });

  describe("Cross-zone move", () => {
    it("should move item from root to nested zone", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", 1, true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items", 0),
        buildFlatItem("b", "item", "g1::zone::items", 3, "g1:items", 0),
      ];

      const preview = computePreview(flat, "a", "b", "before");

      // Check root zone only has g1 now
      const rootItems = preview.filter(
        (i) => i.parentId === "root::zone::content" && i.kind === "item"
      );
      expect(rootItems.map((i) => i.itemId)).toEqual(["g1"]);

      // Check g1:items zone has [a, b]
      const g1Items = preview.filter(
        (i) => i.parentId === "g1::zone::items" && i.kind === "item"
      );
      expect(g1Items.map((i) => i.itemId)).toEqual(["a", "b"]);

      // Verify a's metadata updated
      const aInPreview = preview.find((i) => i.itemId === "a");
      expect(aInPreview?.parentId).toBe("g1::zone::items");
      expect(aInPreview?.depth).toBe(3); // zone.depth + 1
    });
  });

  describe("Inside empty ZoneNode", () => {
    it("should insert into empty zone at index 0", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", 1, true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items", 0, false),
      ];

      const preview = computePreview(flat, "a", "g1::zone::items", "inside");

      // Check a is now in g1:items
      const g1Items = preview.filter(
        (i) => i.parentId === "g1::zone::items" && i.kind === "item"
      );
      expect(g1Items.map((i) => i.itemId)).toEqual(["a"]);

      const aInPreview = preview.find((i) => i.itemId === "a");
      expect(aInPreview?.parentId).toBe("g1::zone::items");
      expect(aInPreview?.depth).toBe(3);
    });
  });

  describe("No-op cases", () => {
    it("should return unchanged preview when active === over", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
      ];

      const preview = computePreview(flat, "a", "a", "before");

      expect(preview).toEqual(flat);
    });

    it("should return unchanged when same parent and position unchanged", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content", 0),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content", 0),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content", 1),
      ];

      // Moving a before b when it's already before b
      const preview = computePreview(flat, "a", "b", "before");

      const itemIds = preview.filter((i) => i.kind === "item").map((i) => i.itemId);
      expect(itemIds).toEqual(["a", "b"]);
    });
  });
});