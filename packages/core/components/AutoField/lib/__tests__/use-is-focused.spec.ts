import { isFocusedPath } from "../use-is-focused";

describe("isFocusedPath", () => {
  it("is focused when the path itself has focus", () => {
    expect(isFocusedPath("title", "title")).toBe(true);
  });

  it("is focused when an array item's subfield has focus", () => {
    expect(isFocusedPath("items[0].title", "items")).toBe(true);
  });

  it("is focused when an object's subfield has focus", () => {
    expect(isFocusedPath("link.label", "link")).toBe(true);
  });

  it("is not focused for a sibling that shares a prefix", () => {
    expect(isFocusedPath("items2[0].title", "items")).toBe(false);
    expect(isFocusedPath("titleText", "title")).toBe(false);
  });

  it("is not focused when a parent or nothing has focus", () => {
    expect(isFocusedPath("items", "items[0].title")).toBe(false);
    expect(isFocusedPath(null, "items")).toBe(false);
  });
});
