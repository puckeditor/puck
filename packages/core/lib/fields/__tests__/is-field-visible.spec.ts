import { isFieldVisible } from "../is-field-visible";

describe("isFieldVisible", () => {
  it("returns false when the field is missing", () => {
    expect(isFieldVisible()).toBe(false);
  });

  it("returns false for slot fields", () => {
    expect(isFieldVisible(undefined, { type: "slot" })).toBe(false);
  });

  it("returns false when the field type override is null", () => {
    expect(
      isFieldVisible({ text: null }, { type: "text", visible: true })
    ).toBe(false);
  });

  it("respects the field `visible` property", () => {
    expect(isFieldVisible(undefined, { type: "text" })).toBe(true);
    expect(isFieldVisible({ text: undefined }, { type: "text" })).toBe(true);
    expect(isFieldVisible(undefined, { type: "text", visible: false })).toBe(
      false
    );
  });
});
