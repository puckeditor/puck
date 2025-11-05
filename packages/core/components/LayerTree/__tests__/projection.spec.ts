import { projectDrop, Projection } from "../projection";
import { FlattenedItem } from "../projection";

/**
 * Test suite for pure projection engine
 * Following TDD design from 2025-11-03-outline-dnd-rewrite-tdd.md
 */
describe("projectDrop - pure projection engine", () => {
  // Helper to build test flattened items
  const buildFlatItem = (
    itemId: string,
    kind: "zone" | "item",
    parentId: string | null,
    depth: number,
    zoneCompound: string,
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
        index: 0, // Simplified for tests
        nodeData: {} as any, // Simplified for tests
      };
    }
  };

  describe("Insert within a ZoneNode", () => {
    it("should insert at top of a ZoneNode's children", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "b", "a", "before");

      expect(result.valid).toBe(true);
      expect(result.destinationZone).toBe("root:content");
      expect(result.insertIndex).toBe(0);
      expect(result.isReorder).toBe(true);
    });

    it("should insert at middle of a ZoneNode's children", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "b", "after");

      expect(result.valid).toBe(true);
      expect(result.destinationZone).toBe("root:content");
      expect(result.insertIndex).toBe(2);
      expect(result.isReorder).toBe(true);
    });

    it("should insert at bottom of a ZoneNode's children", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "b", "after");

      expect(result.valid).toBe(true);
      expect(result.destinationZone).toBe("root:content");
      expect(result.insertIndex).toBe(2);
      expect(result.isReorder).toBe(true);
    });
  });

  describe("Insert into empty ZoneNode", () => {
    it("should insert at index 0 in an empty ZoneNode", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem(
          "root::zone::content",
          "zone",
          null,
          0,
          "root:content",
          false
        ),
        buildFlatItem("g1::zone::items", "zone", "g1", 1, "g1:items", false),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "g1::zone::items", "inside");

      expect(result.valid).toBe(true);
      expect(result.destinationZone).toBe("g1:items");
      expect(result.insertIndex).toBe(0);
      expect(result.isReorder).toBe(false);
    });
  });

  describe("Reorder within same ZoneNode", () => {
    it("should detect reorder when moving within same parent zone", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "c", "before");

      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(true);
      expect(result.destinationZone).toBe("root:content");
    });

    it("should handle reorder from start to end", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "c", "after");

      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(true);
      expect(result.insertIndex).toBe(3);
    });
  });

  describe("Cross-zone move", () => {
    it("should move between different ZoneNodes (isReorder = false)", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("b", "item", "g1::zone::items", 3, "g1:items"),
      ];

      const result = projectDrop(flat, "a", "b", "before");

      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(false);
      expect(result.destinationZone).toBe("g1:items");
      expect(result.insertIndex).toBe(0);
    });

    it("should move from nested zone to root zone", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "b", "after");

      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(false);
      expect(result.destinationZone).toBe("root:content");
      expect(result.insertIndex).toBe(2);
    });
  });

  describe("Hover over component row", () => {
    it("should resolve hover on component to its parent ZoneNode", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
      ];

      // Hover over g1 component with "before" position
      const result = projectDrop(flat, "a", "g1", "before");

      expect(result.valid).toBe(true);
      // Should resolve to parent zone of g1, which is root::zone::content
      expect(result.parentZoneId).toBe("root::zone::content");
      expect(result.destinationZone).toBe("root:content");
    });

    it("should resolve hover on component to its parent ZoneNode with after", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "g1", "after");

      expect(result.valid).toBe(true);
      expect(result.parentZoneId).toBe("root::zone::content");
      expect(result.destinationZone).toBe("root:content");
    });
  });

  describe("Illegal reparent detection", () => {
    it("should detect reparenting into own subtree (valid = false)", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
      ];

      // Try to move g1 into its own child zone
      const result = projectDrop(flat, "g1", "a", "after");

      expect(result.valid).toBe(false);
    });

    it("should detect deeper subtree reparenting", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("g2", "item", "g1::zone::items", 3, "g1:items", true),
        buildFlatItem("g2::zone::content", "zone", "g2", 4, "g2:content"),
        buildFlatItem("b", "item", "g2::zone::content", 5, "g2:content"),
      ];

      // Try to move g1 into g2's zone (g2 is descendant of g1)
      const result = projectDrop(flat, "g1", "b", "before");

      expect(result.valid).toBe(false);
    });
  });

  describe("Index clamp boundaries", () => {
    it("should clamp insertIndex to minimum of 0", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "a", "before");

      expect(result.valid).toBe(true);
      expect(result.insertIndex).toBeGreaterThanOrEqual(0);
    });

    it("should clamp insertIndex to siblingsCount", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "c", "after");

      expect(result.valid).toBe(true);
      expect(result.insertIndex).toBeLessThanOrEqual(3);
    });
  });

  describe("Collapsed ancestors", () => {
    it("should compute correct parent/index regardless of expansion state", () => {
      // Build flat with isExpanded = false for parent
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        {
          kind: "item" as const,
          itemId: "g1",
          zoneCompound: "root:content",
          parentId: "root::zone::content",
          depth: 1,
          hasChildren: true,
          isExpanded: false, // Collapsed
          index: 0,
          nodeData: {} as any,
        },
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      // Even though g1 is collapsed, projection should work
      const result = projectDrop(flat, "b", "a", "before");

      expect(result.valid).toBe(true);
      expect(result.destinationZone).toBe("g1:items");
    });
  });

  describe("Drop inside ZoneNode", () => {
    it("should handle 'inside' position on ZoneNode correctly", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "b", "g1::zone::items", "inside");

      expect(result.valid).toBe(true);
      expect(result.parentZoneId).toBe("g1::zone::items");
      expect(result.destinationZone).toBe("g1:items");
      expect(result.insertIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Multiple zones on same component", () => {
    it("should distinguish between different zones on same component", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("g1::zone::content", "zone", "g1", 2, "g1:content"),
        buildFlatItem("b", "item", "g1::zone::content", 3, "g1:content"),
      ];

      // Move from items to content zone
      const result = projectDrop(flat, "a", "b", "before");

      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(false);
      expect(result.destinationZone).toBe("g1:content");
    });
  });

  describe("Edge case: same item", () => {
    it("should handle dropping item on itself", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "a", "before");

      // Should still be valid, just a no-op
      expect(result.valid).toBe(true);
      expect(result.isReorder).toBe(true);
    });
  });

  describe("Depth constraints", () => {
    it("should compute constrainedDepth based on neighbors", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "b", "before");

      expect(result.valid).toBe(true);
      expect(result.constrainedDepth).toBeDefined();
      expect(typeof result.constrainedDepth).toBe("number");
    });
  });
});