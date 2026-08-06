import { clamp, getDistanceToSegment } from "../math";

describe("clamp", () => {
  it("returns the value when in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the bounds", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("distanceToSegment", () => {
  it("returns 0 for a point on the segment", () => {
    expect(
      getDistanceToSegment({ x: 5, y: 0 }, { x1: 0, y1: 0, x2: 10, y2: 0 })
    ).toBe(0);
  });

  it("measures perpendicular distance to a vertical segment", () => {
    expect(
      getDistanceToSegment({ x: 5, y: 5 }, { x1: 0, y1: 0, x2: 0, y2: 10 })
    ).toBe(5);
  });

  it("clamps beyond the segment endpoints", () => {
    // Point is past the right endpoint of a horizontal segment.
    expect(
      getDistanceToSegment({ x: 20, y: 0 }, { x1: 0, y1: 0, x2: 10, y2: 0 })
    ).toBe(10);
    // Point is past the right endpoint and offset on the cross axis.
    expect(
      getDistanceToSegment({ x: 13, y: 4 }, { x1: 0, y1: 0, x2: 10, y2: 0 })
    ).toBe(5);
  });

  it("handles unordered endpoints", () => {
    expect(
      getDistanceToSegment({ x: 5, y: 5 }, { x1: 0, y1: 10, x2: 0, y2: 0 })
    ).toBe(5);
  });
});
