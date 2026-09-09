import { isFieldTypeHidden } from "../field-types";

describe("isFieldTypeHidden", () => {
  it("returns true when the matching override is null", () => {
    expect(isFieldTypeHidden({ text: null }, "text")).toBe(true);
  });

  it("returns false when the matching override is a component", () => {
    expect(isFieldTypeHidden({ text: () => null }, "text")).toBe(false);
  });

  it("returns false when the override doesn't set the field type as null", () => {
    expect(isFieldTypeHidden(undefined, "text")).toBe(false);
    expect(isFieldTypeHidden({}, "text")).toBe(false);
    expect(isFieldTypeHidden({ text: undefined }, "text")).toBe(false);
  });

  it("returns false when the field type is missing", () => {
    expect(isFieldTypeHidden({ text: null })).toBe(false);
  });
});
