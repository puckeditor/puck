import { Config } from "../../../types";
import { NodeIndex, PuckNodeData, ZoneIndex } from "../../../types/Internal";
import { rootDroppableId } from "../../root-droppable-id";
import { getZoneConstraints } from "../resolve-zone-constraints";

const makeNode = (id: string, type: string): PuckNodeData => ({
  data: { type, props: { id } },
  flatData: { type, props: { id } },
  parentId: null,
  zone: "",
  path: [],
});

const config: Config = {
  components: {
    Grid: {
      fields: {
        items: { type: "slot", allow: ["Card"] },
        title: { type: "text" },
      },
      render: () => <div />,
    },
    Card: {
      render: () => <div />,
    },
  },
  root: {
    fields: {
      content: { type: "slot", disallow: ["Grid"] },
    },
    render: () => <div />,
  },
};

const nodes: NodeIndex = {
  "grid-1": makeNode("grid-1", "Grid"),
  "card-1": makeNode("card-1", "Card"),
  root: makeNode("root", "root"),
};

const zones: ZoneIndex = {
  [rootDroppableId]: { contentIds: [], type: "root" },
  "root:content": { contentIds: [], type: "slot" },
  "grid-1:items": { contentIds: [], type: "slot" },
  "grid-1:title": { contentIds: [], type: "slot" },
  "card-1:zone1": { contentIds: [], type: "dropzone" },
};

const indexes = { nodes, zones };

describe("resolve-zone-constraints", () => {
  it("resolves allow/disallow for a slot zone from the component's fields", () => {
    expect(getZoneConstraints("grid-1:items", config, indexes)).toEqual({
      allow: ["Card"],
      disallow: undefined,
    });
  });

  it("resolves root slot zones from the root config fields", () => {
    expect(getZoneConstraints("root:content", config, indexes)).toEqual({
      allow: undefined,
      disallow: ["Grid"],
    });
  });

  it("resolves the root default zone as unconstrained", () => {
    expect(getZoneConstraints(rootDroppableId, config, indexes)).toEqual({});
  });

  it("resolves legacy dropzone zones as unconstrained", () => {
    expect(getZoneConstraints("card-1:zone1", config, indexes)).toEqual({});
  });

  it("resolves unknown zones as unconstrained", () => {
    expect(getZoneConstraints("missing:zone", config, indexes)).toEqual({});
  });

  it("resolves as unconstrained when the field is not a slot", () => {
    expect(getZoneConstraints("grid-1:title", config, indexes)).toEqual({});
  });
});
