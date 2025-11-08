import { projectDrop, Projection } from "../projection";
import { FlattenedItem } from "../projection";

/**
 * Extended projection tests for edge cases identified in code review
 */
describe("projectDrop - extended edge cases", () => {
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
        index: 0,
        nodeData: {} as any,
      };
    }
  };

  describe("Dropping over ZoneNode directly", () => {
    it("should handle 'before' on ZoneNode - insert at beginning", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("b", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      // Move c (from root) into g1::zone::items before existing items
      const result = projectDrop(flat, "c", "g1::zone::items", "before");

      expect(result.valid).toBe(true);
      expect(result.parentZoneId).toBe("g1::zone::items");
      expect(result.destinationZone).toBe("g1:items");
      expect(result.insertIndex).toBe(0);
      expect(result.constrainedDepth).toBe(3); // zone.depth + 1
    });

    it("should handle 'after' on ZoneNode - insert at end", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("a", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("b", "item", "g1::zone::items", 3, "g1:items"),
        buildFlatItem("c", "item", "root::zone::content", 1, "root:content"),
      ];

      // Move c (from root) into g1::zone::items after existing items
      const result = projectDrop(flat, "c", "g1::zone::items", "after");

      expect(result.valid).toBe(true);
      expect(result.parentZoneId).toBe("g1::zone::items");
      expect(result.destinationZone).toBe("g1:items");
      expect(result.insertIndex).toBe(2); // childCount
      expect(result.constrainedDepth).toBe(3);
    });
  });

  describe("Index clamping at boundaries", () => {
    it("should never produce insertIndex < 0", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "a", "before");

      expect(result.valid).toBe(true);
      expect(result.insertIndex).toBeGreaterThanOrEqual(0);
    });

    it("should never produce insertIndex > siblingsCount", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("a", "item", "root::zone::content", 1, "root:content"),
        buildFlatItem("b", "item", "root::zone::content", 1, "root:content"),
      ];

      const result = projectDrop(flat, "a", "b", "after");

      expect(result.valid).toBe(true);
      expect(result.insertIndex).toBeLessThanOrEqual(2); // max is siblingsCount
    });
  });

  describe("Subtree validation with ZoneNode ids", () => {
    it("should detect moving into own descendant zone using ZoneNode id", () => {
      const flat: FlattenedItem[] = [
        buildFlatItem("root::zone::content", "zone", null, 0, "root:content"),
        buildFlatItem("g1", "item", "root::zone::content", 1, "root:content", true),
        buildFlatItem("g1::zone::items", "zone", "g1", 2, "g1:items"),
        buildFlatItem("g2", "item", "g1::zone::items", 3, "g1:items", true),
        buildFlatItem("g2::zone::content", "zone", "g2", 4, "g2:content"),
        buildFlatItem("b", "item", "g2::zone::content", 5, "g2:content"),
      ];

      // Try to move g1 into g2::zone::content (g2 is descendant of g1)
      const result = projectDrop(flat, "g1", "g2::zone::content", "inside");

      expect(result.valid).toBe(false);
    });
  });
});