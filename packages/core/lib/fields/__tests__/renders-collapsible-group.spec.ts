import { rendersCollapsibleGroup } from "../renders-collapsible-group";

const object = (objectFields: any, collapsible = true): any => ({
  type: "object",
  collapsible,
  objectFields,
});

describe("rendersCollapsibleGroup", () => {
  it("returns true for a collapsible object with a visible subfield", () => {
    expect(rendersCollapsibleGroup(object({ a: { type: "text" } }))).toBe(true);
  });

  it("returns false for objects that aren't collapsible, and other fields", () => {
    expect(
      rendersCollapsibleGroup(object({ a: { type: "text" } }, false))
    ).toBe(false);
    expect(rendersCollapsibleGroup({ type: "text" })).toBe(false);
  });

  it("returns false when an override renders objects", () => {
    expect(
      rendersCollapsibleGroup(object({ a: { type: "text" } }), {
        object: ({ children }) => children,
      })
    ).toBe(false);
  });

  it("returns false when every subfield is hidden", () => {
    expect(
      rendersCollapsibleGroup(
        object({ a: { type: "text", visible: false }, b: { type: "slot" } })
      )
    ).toBe(false);
    expect(
      rendersCollapsibleGroup(object({ a: { type: "text" } }), { text: null })
    ).toBe(false);
  });
});
