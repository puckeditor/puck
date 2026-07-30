import { Config } from "../../../../types";
import { NodeIndex, PuckNodeData, ZoneIndex } from "../../../../types/Internal";
import { rootDroppableId } from "../../../../lib/root-droppable-id";
import {
  isSourceOrDescendantOfSource,
  itemAcceptsComponent,
  zoneAcceptsComponent,
} from "../dnd/compute";

const makeNode = (
  id: string,
  type: string,
  path: string[] = []
): PuckNodeData => ({
  data: { type, props: { id } },
  flatData: { type, props: { id } },
  parentId: null,
  zone: "",
  path,
});

const config: Config = {
  components: {
    Grid: {
      fields: {
        items: { type: "slot", allow: ["Card"] },
        header: { type: "slot", allow: ["Heading"] },
      },
      render: () => <div />,
    },
    Card: {
      render: () => <div />,
    },
    Heading: {
      render: () => <div />,
    },
  },
};

// grid-1 > card-1 > (nothing); card-2 sits beside grid-1 at the root
const nodes: NodeIndex = {
  "grid-1": makeNode("grid-1", "Grid", [rootDroppableId]),
  "card-1": makeNode("card-1", "Card", [rootDroppableId, "grid-1:items"]),
  "card-2": makeNode("card-2", "Card", [rootDroppableId]),
};

const zones: ZoneIndex = {
  [rootDroppableId]: { contentIds: ["grid-1", "card-2"], type: "root" },
  "grid-1:items": { contentIds: ["card-1"], type: "slot" },
  "grid-1:header": { contentIds: [], type: "slot" },
};

const indexes = { nodes, zones };

describe("outline compute", () => {
  describe("zoneAcceptsComponent", () => {
    it("applies the zone's config constraints to the dragged type", () => {
      expect(
        zoneAcceptsComponent(new Map(), "grid-1:items", "Card", config, indexes)
      ).toBe(true);

      expect(
        zoneAcceptsComponent(new Map(), "grid-1:items", "Grid", config, indexes)
      ).toBe(false);

      expect(
        zoneAcceptsComponent(
          new Map(),
          "grid-1:header",
          "Heading",
          config,
          indexes
        )
      ).toBe(true);

      expect(
        zoneAcceptsComponent(
          new Map(),
          "grid-1:header",
          "Card",
          config,
          indexes
        )
      ).toBe(false);
    });

    it("memoizes results in the provided cache", () => {
      const cache = new Map<string, boolean>();

      cache.set("zone:grid-1:items", false);

      // Cache is false even though config sets it as allowed
      expect(
        zoneAcceptsComponent(cache, "grid-1:items", "Card", config, indexes)
      ).toBe(false);
    });
  });

  describe("itemAcceptsComponent", () => {
    it("returns true when at least one child zone accepts the type", () => {
      // items accepts Card even though header rejects it
      expect(
        itemAcceptsComponent(new Map(), "grid-1", "Card", config, indexes)
      ).toBe(true);
    });

    it("returns false when every child zone rejects the type", () => {
      expect(
        itemAcceptsComponent(new Map(), "grid-1", "Grid", config, indexes)
      ).toBe(false);
    });

    it("returns false for items without child zones", () => {
      expect(
        itemAcceptsComponent(new Map(), "card-1", "Card", config, indexes)
      ).toBe(false);
    });
  });

  describe("isSourceOrDescendantOfSource", () => {
    it("matches the source itself", () => {
      expect(
        isSourceOrDescendantOfSource(new Map(), "grid-1", "grid-1", nodes)
      ).toBe(true);
    });

    it("matches descendants of the source via their path", () => {
      expect(
        isSourceOrDescendantOfSource(new Map(), "card-1", "grid-1", nodes)
      ).toBe(true);
    });

    it("does not match siblings or ancestors", () => {
      expect(
        isSourceOrDescendantOfSource(new Map(), "card-2", "grid-1", nodes)
      ).toBe(false);

      expect(
        isSourceOrDescendantOfSource(new Map(), "grid-1", "card-1", nodes)
      ).toBe(false);
    });
  });
});
