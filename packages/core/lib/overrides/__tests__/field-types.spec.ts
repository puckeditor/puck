import { isFieldTypeHidden, isFieldTypeOverrideActive } from "../field-types";

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

describe("isFieldTypeOverrideActive", () => {
  it("returns true when the field type's override is rendering above", () => {
    expect(isFieldTypeOverrideActive({ text: true }, "text")).toBe(true);
  });

  it("returns false for a field type whose override isn't rendering above", () => {
    expect(isFieldTypeOverrideActive({ text: true }, "number")).toBe(false);
  });

  it("returns true for mutually recursive overrides", () => {
    expect(
      isFieldTypeOverrideActive({ text: true, number: true }, "text")
    ).toBe(true);
  });

  it("returns false when nothing is rendering above", () => {
    expect(isFieldTypeOverrideActive(undefined, "text")).toBe(false);
    expect(isFieldTypeOverrideActive({}, "text")).toBe(false);
  });

  it("returns false when the field type is missing", () => {
    expect(isFieldTypeOverrideActive({ text: true })).toBe(false);
  });

  it("returns false for a field type inherited from Object.prototype", () => {
    expect(isFieldTypeOverrideActive({ text: true }, "toString")).toBe(false);
    expect(isFieldTypeOverrideActive({ text: true }, "constructor")).toBe(
      false
    );
    expect(isFieldTypeOverrideActive({}, "hasOwnProperty")).toBe(false);
  });
});
