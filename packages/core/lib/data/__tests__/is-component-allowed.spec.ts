import { isComponentAllowed } from "../is-component-allowed";

describe("is-component-allowed", () => {
  it("accepts any type when no constraints are set", () => {
    expect(isComponentAllowed("Heading", {})).toBe(true);
  });

  it("accepts an unset componentType regardless of constraints", () => {
    expect(isComponentAllowed(null, { allow: ["Card"] })).toBe(true);
    expect(isComponentAllowed(undefined, { disallow: ["Card"] })).toBe(true);
  });

  describe("with allow only", () => {
    it("accepts types in the allow list", () => {
      expect(isComponentAllowed("Card", { allow: ["Card"] })).toBe(true);
    });

    it("rejects types not in the allow list", () => {
      expect(isComponentAllowed("Heading", { allow: ["Card"] })).toBe(false);
    });
  });

  describe("with disallow only", () => {
    it("rejects types in the disallow list", () => {
      expect(isComponentAllowed("Card", { disallow: ["Card"] })).toBe(false);
    });

    it("accepts types not in the disallow list", () => {
      expect(isComponentAllowed("Heading", { disallow: ["Card"] })).toBe(true);
    });
  });

  describe("with both allow and disallow", () => {
    it("accepts types in both lists", () => {
      expect(
        isComponentAllowed("Card", { allow: ["Card"], disallow: ["Card"] })
      ).toBe(true);
    });

    it("rejects types only in the disallow list", () => {
      expect(
        isComponentAllowed("Heading", {
          allow: ["Card"],
          disallow: ["Heading"],
        })
      ).toBe(false);
    });

    it("accepts types in neither list", () => {
      expect(
        isComponentAllowed("Text", { allow: ["Card"], disallow: ["Heading"] })
      ).toBe(true);
    });
  });
});
