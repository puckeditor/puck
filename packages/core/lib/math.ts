/** Clamp `value` to the inclusive range [min, max]. */
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type Point = { x: number; y: number };
type Segment = { x1: number; y1: number; x2: number; y2: number };

/**
 * Gets the distance from a point to the closest point of a line segment in a 2D plane using pythagoras' theorem.
 *
 * @param point The point to measure from.
 * @param segment The line segment to measure to.
 * @returns The distance from the point to the closest point on the line segment.
 *
 * @example
 * ```ts
 * const point = { x: 5, y: 5 };
 * const segment = { x1: 0, y1: 0, x2: 10, y2: 0 };
 * // Closest point on the segment is ({ x: 5, y: 0 }).
 * console.log(getDistanceToSegment(point, segment)); // 5
 *
 * const point2 = { x: 20, y: 20 };
 * const segment2 = { x1: 0, y1: 0, x2: 0, y2: 10 };
 * // Closest point on the segment is ({ x: 0, y: 10 }).
 * console.log(getDistanceToSegment(point2, segment2)); // ~ 22.36
 * ```
 */
export const getDistanceToSegment = (point: Point, segment: Segment) => {
  const x = clamp(
    point.x,
    Math.min(segment.x1, segment.x2),
    Math.max(segment.x1, segment.x2)
  );
  const y = clamp(
    point.y,
    Math.min(segment.y1, segment.y2),
    Math.max(segment.y1, segment.y2)
  );

  return Math.hypot(point.x - x, point.y - y);
};
