import { getZoneContentIds } from "../get-zone-content-ids";
import type { PrivateAppState } from "../../types/Internal";

const state = {
  indexes: {
    nodes: {},
    zones: {
      "root:main": { contentIds: ["a", "b"], type: "dropzone" },
    },
  },
} as unknown as PrivateAppState;

describe("getZoneContentIds", () => {
  it("returns a zone's content ids", () => {
    expect(getZoneContentIds(state, "root:main")).toEqual(["a", "b"]);
  });

  it("defaults to an empty array for an unknown zone", () => {
    expect(getZoneContentIds(state, "missing")).toEqual([]);
  });
});
