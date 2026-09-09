import { resolveDndMode } from "../resolve-dnd-mode";

describe("resolveDndMode", () => {
  it("uses fluid mode within a slot for auto behavior", () => {
    expect(resolveDndMode("auto")).toBe("fluid");
  });

  it("uses static mode between slots and for new components for auto behavior", () => {
    expect(resolveDndMode("auto", { isDraggingBetweenSlots: true })).toBe(
      "static"
    );
    expect(resolveDndMode("auto", { isNewComponent: true })).toBe("static");
  });

  it("always uses fluid mode for fluid behavior", () => {
    expect(resolveDndMode("fluid")).toBe("fluid");
    expect(resolveDndMode("fluid", { isDraggingBetweenSlots: true })).toBe(
      "fluid"
    );
    expect(resolveDndMode("fluid", { isNewComponent: true })).toBe("fluid");
  });

  it("always uses static mode for static behavior", () => {
    expect(resolveDndMode("static")).toBe("static");
    expect(resolveDndMode("static", { isDraggingBetweenSlots: true })).toBe(
      "static"
    );
    expect(resolveDndMode("static", { isNewComponent: true })).toBe("static");
  });
});
