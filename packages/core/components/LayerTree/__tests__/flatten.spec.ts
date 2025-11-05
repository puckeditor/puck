import { flattenPuckZones, FlattenedPuckItem } from "../flatten";
import { PrivateAppState } from "../../../types/Internal";
import { rootDroppableId } from "../../../lib/root-droppable-id";

/**
 * Test suite for ZoneNode normalization in flatten.ts
 * Following TDD design from 2025-11-03-outline-dnd-rewrite-tdd.md
 */
describe("flattenPuckZones with ZoneNode normalization", () => {
  // Helper to build minimal PrivateAppState for testing
  const buildState = (
    zonesById: Record<string, string[]>,
    nodesById: Record<string, { type: string; props: any }>
  ): PrivateAppState => {
    const nodes: any = {};
    const zones: any = {};

    // Build zones index
    Object.entries(zonesById).forEach(([zoneCompound, contentIds]) => {
      zones[zoneCompound] = {
        contentIds,
        type: zoneCompound.includes(rootDroppableId) ? "root" : "dropzone",
      };
    });

    // Build nodes index
    Object.entries(nodesById).forEach(([id, nodeInfo]) => {
      const zoneForNode = Object.keys(zonesById).find((z) =>
        zonesById[z].includes(id)
      );
      const pathParts = zoneForNode ? [zoneForNode] : [];

      nodes[id] = {
        data: { type: nodeInfo.type, props: nodeInfo.props },
        flatData: { type: nodeInfo.type, props: nodeInfo.props },
        parentId: null, // Simplified for tests
        zone: zoneForNode || rootDroppableId,
        path: pathParts,
      };
    });

    return {
      data: { root: {}, content: [], zones: {} },
      ui: { itemSelector: null } as any,
      indexes: { nodes, zones },
    } as PrivateAppState;
  };

  describe("ZoneNode emission for root zones", () => {
    it("should emit ZoneNodes for root zones before their children", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["a1", "a2"],
        },
        {
          a1: { type: "GridBlock", props: { id: "a1" } },
          a2: { type: "Text", props: { id: "a2" } },
        }
      );

      const flat = flattenPuckZones(state, new Set());

      // Should have ZoneNode for root zone, then children
      expect(flat.length).toBeGreaterThan(2);
      
      // First item should be a ZoneNode for root
      const firstItem = flat[0];
      expect(firstItem.itemId).toContain("::zone::");
      expect(firstItem.zoneCompound).toBe(rootDroppableId);
    });
  });

  describe("ZoneNode emission for component-owned zones", () => {
    it("should emit ZoneNodes for component zones using synthetic id convention", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["a1", "a2"],
          "g1:content": ["b1"],
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          a1: { type: "Text", props: { id: "a1" } },
          a2: { type: "Text", props: { id: "a2" } },
          b1: { type: "Heading", props: { id: "b1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1"]));

      // Find ZoneNodes by synthetic id pattern
      const zoneNodes = flat.filter((item) => item.itemId.includes("::zone::"));

      // Should have ZoneNodes for: root, g1:items, g1:content
      expect(zoneNodes.length).toBeGreaterThanOrEqual(3);

      // Check synthetic id convention
      const itemsZoneNode = zoneNodes.find((n) =>
        n.itemId.includes("g1::zone::items")
      );
      expect(itemsZoneNode).toBeDefined();
      expect(itemsZoneNode?.zoneCompound).toBe("g1:items");

      const contentZoneNode = zoneNodes.find((n) =>
        n.itemId.includes("g1::zone::content")
      );
      expect(contentZoneNode).toBeDefined();
      expect(contentZoneNode?.zoneCompound).toBe("g1:content");
    });
  });

  describe("ZoneNode parenting and ordering", () => {
    it("should place all zone children directly under their ZoneNode", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["a1", "a2"],
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          a1: { type: "Text", props: { id: "a1" } },
          a2: { type: "Text", props: { id: "a2" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1"]));

      // Find the items ZoneNode
      const itemsZoneIdx = flat.findIndex((item) =>
        item.itemId.includes("g1::zone::items")
      );
      expect(itemsZoneIdx).toBeGreaterThanOrEqual(0);

      // Next items should be a1 and a2
      const nextItem = flat[itemsZoneIdx + 1];
      const nextNextItem = flat[itemsZoneIdx + 2];

      expect(nextItem?.itemId).toBe("a1");
      expect(nextItem?.parentId).toContain("g1::zone::items");

      expect(nextNextItem?.itemId).toBe("a2");
      expect(nextNextItem?.parentId).toContain("g1::zone::items");
    });
  });

  describe("ZoneNode depth calculation", () => {
    it("should set ZoneNode.depth = parent.depth + 1", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["a1"],
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          a1: { type: "Text", props: { id: "a1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1"]));

      const rootZone = flat.find((item) =>
        item.itemId.includes("root::zone::")
      );
      const g1Item = flat.find((item) => item.itemId === "g1");
      const itemsZone = flat.find((item) =>
        item.itemId.includes("g1::zone::items")
      );
      const a1Item = flat.find((item) => item.itemId === "a1");

      // Root ZoneNode is at depth 0
      expect(rootZone?.depth).toBe(0);

      // g1 is child of root ZoneNode, so depth 1
      expect(g1Item?.depth).toBe(1);

      // g1:items ZoneNode is child of g1, so depth 2
      expect(itemsZone?.depth).toBe(2);

      // a1 (child of g1:items ZoneNode) should be depth 3
      expect(a1Item?.depth).toBe(3);
    });
  });

  describe("ZoneNode hasChildren flag", () => {
    it("should reflect content presence per zone", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["a1"],
          "g1:content": [], // Empty zone
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          a1: { type: "Text", props: { id: "a1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1"]));

      const itemsZone = flat.find((item) =>
        item.itemId.includes("g1::zone::items")
      );
      const contentZone = flat.find((item) =>
        item.itemId.includes("g1::zone::content")
      );

      expect(itemsZone?.hasChildren).toBe(true);
      expect(contentZone?.hasChildren).toBe(false);
    });
  });

  describe("Expansion behavior", () => {
    it("should expand ancestors of selected items including ZoneNodes", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["a1"],
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          a1: { type: "Text", props: { id: "a1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(), "a1");

      const g1Item = flat.find((item) => item.itemId === "g1");
      const itemsZone = flat.find((item) =>
        item.itemId.includes("g1::zone::items")
      );

      // Both parent component and ZoneNode should be expanded
      expect(g1Item?.isExpanded).toBe(true);
      expect(itemsZone?.isExpanded).toBe(true);
    });
  });

  describe("ID collision prevention", () => {
    it("should ensure synthetic ZoneNode ids never match real item ids", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["item1"],
          "item1:content": ["item2"],
        },
        {
          item1: { type: "GridBlock", props: { id: "item1" } },
          item2: { type: "Text", props: { id: "item2" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["item1"]));

      const allIds = flat.map((item) => item.itemId);
      const uniqueIds = new Set(allIds);

      // No duplicate IDs
      expect(allIds.length).toBe(uniqueIds.size);

      // Real item IDs should not contain ::zone::
      const realItemIds = allIds.filter((id) => !id.includes("::zone::"));
      expect(realItemIds).toContain("item1");
      expect(realItemIds).toContain("item2");

      // ZoneNode IDs should contain ::zone::
      const zoneNodeIds = allIds.filter((id) => id.includes("::zone::"));
      expect(zoneNodeIds.length).toBeGreaterThan(0);
    });
  });

  describe("Empty zones", () => {
    it("should render empty ZoneNodes with hasChildren = false", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": [], // Empty zone
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1"]));

      const itemsZone = flat.find((item) =>
        item.itemId.includes("g1::zone::items")
      );

      expect(itemsZone).toBeDefined();
      expect(itemsZone?.hasChildren).toBe(false);
      expect(itemsZone?.zoneCompound).toBe("g1:items");
    });
  });

  describe("Complex nested structure", () => {
    it("should handle nested zone-owning components", () => {
      const state = buildState(
        {
          [rootDroppableId]: ["g1"],
          "g1:items": ["g2", "a1"],
          "g2:content": ["b1"],
        },
        {
          g1: { type: "GridBlock", props: { id: "g1" } },
          g2: { type: "GridBlock", props: { id: "g2" } },
          a1: { type: "Text", props: { id: "a1" } },
          b1: { type: "Text", props: { id: "b1" } },
        }
      );

      const flat = flattenPuckZones(state, new Set(["g1", "g2"]));

      // Should have ZoneNodes for: root, g1:items, g2:content
      const zoneNodes = flat.filter((item) => item.itemId.includes("::zone::"));
      expect(zoneNodes.length).toBeGreaterThanOrEqual(3);

      // Verify depth progression
      const rootZone = flat.find((item) => item.itemId.includes("root::zone::"));
      const g1Item = flat.find((item) => item.itemId === "g1");
      const g1Zone = flat.find((item) => item.itemId.includes("g1::zone::"));
      const g2Item = flat.find((item) => item.itemId === "g2");
      const g2Zone = flat.find((item) => item.itemId.includes("g2::zone::"));
      const b1Item = flat.find((item) => item.itemId === "b1");

      // Root zone at 0, g1 at 1, g1:items zone at 2, g2 at 3, g2:content zone at 4, b1 at 5
      expect(rootZone?.depth).toBe(0);
      expect(g1Item?.depth).toBe(1);
      expect(g1Zone?.depth).toBe(2);
      expect(g2Item?.depth).toBe(3);
      expect(g2Zone?.depth).toBe(4);
      expect(b1Item?.depth).toBe(5);
    });
  });
});