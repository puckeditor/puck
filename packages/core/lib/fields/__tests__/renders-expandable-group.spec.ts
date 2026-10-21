import { rendersExpandableGroup } from "../renders-expandable-group";

const object = (objectFields: any, expandable = true): any => ({
  type: "object",
  expandable,
  objectFields,
});

describe("rendersExpandableGroup", () => {
  it("returns true for an expandable object with a visible subfield", () => {
    expect(rendersExpandableGroup(object({ a: { type: "text" } }))).toBe(true);
  });

  it("returns false for objects that aren't expandable, and other fields", () => {
    expect(rendersExpandableGroup(object({ a: { type: "text" } }, false))).toBe(
      false
    );
    expect(rendersExpandableGroup({ type: "text" })).toBe(false);
  });

  it("returns false when an override renders objects", () => {
    expect(
      rendersExpandableGroup(object({ a: { type: "text" } }), {
        object: ({ children }) => children,
      })
    ).toBe(false);
  });

  it("returns false when every subfield is hidden", () => {
    expect(
      rendersExpandableGroup(
        object({ a: { type: "text", visible: false }, b: { type: "slot" } })
      )
    ).toBe(false);
    expect(
      rendersExpandableGroup(object({ a: { type: "text" } }), { text: null })
    ).toBe(false);
  });
});
