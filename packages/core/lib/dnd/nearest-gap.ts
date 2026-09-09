import { getDistanceToSegment } from "../math";
import { getItemEdgeAccessors, resolveZoneFlow } from "./resolve-flow";

type Point = { x: number; y: number };

type GapCandidate = {
  index: number;
  // A line segment describing the gap, ordered so x1 <= x2 and y1 <= y2.
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // The cross-axis band of the row/column (row/column) the gap belongs to, taken
  // from its neighbor items' cross extents (for horizontal -> top/bottom, vertical -> left/right).
  // Used to prioritize gaps that share the pointer's row/column over geometrically nearer gaps in adjacent lanes.
  laneStart: number;
  laneEnd: number;
};

/**
 * Returns the insertion index in the content ids whose gap is nearest the pointer in the screen.
 *
 * Selection follows the zone's resolved flow: gaps in the row (or column, for
 * vertical flows) under the pointer win over geometrically nearer gaps in
 * adjacent rows/columns, so dragging along a row targets that row's previous
 * and next gaps rather than flipping to the row above or below. When the
 * pointer sits in no lane (between rows, or in zone padding), the nearest gap
 * overall wins.
 *
 * @param zoneEl The dropzone element in the DOM. This contains the items.
 * @param pointer The pointer position in viewport coordinates.
 * @param contentIds The content ids of all items in the zone, in order.
 * @returns The index of the nearest gap, or null if no gaps exist (i.e., the zone is not on screen).
 */
export const getNearestGapIndex = (
  zoneEl: Element,
  pointer: Point,
  contentIds: string[]
): number | null => {
  const win = zoneEl.ownerDocument.defaultView;

  if (!win) return null;

  const indexById = new Map(contentIds.map((id, index) => [id, index]));

  // Get the rendered items in order of their content index, excluding the flying drag element and any placeholder clones.
  // Rendered items are mapped back to their real content indices via `contentIds`, because
  // virtualized zones only render a window of their content, so DOM order can't be used as the index directly.
  const rendered = Array.from(
    zoneEl.querySelectorAll(
      ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-dnd-placeholder])"
    )
  )
    .map((el) => ({
      index: indexById.get(el.getAttribute("data-puck-component") ?? "") ?? -1,
      el,
    }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => a.index - b.index)
    .map(({ index, el }) => ({ index, rect: el.getBoundingClientRect() }));

  // No rendered items means the first position is the only option, so return 0.
  if (rendered.length === 0) return 0;

  const zoneFlow = resolveZoneFlow(zoneEl, win);

  const { horizontal, reversed, start, end } = getItemEdgeAccessors(zoneFlow);

  // A gap is a line perpendicular to the main axis at `main`, spanning the
  // full cross-axis extent of the closest item (neighbor). Its lane band is
  // the union of the given neighbors' cross extents, so mixed-size neighbors
  // both count towards the gap's row/column.
  const getGapAt = (
    index: number,
    main: number,
    cross: DOMRect,
    lane: DOMRect[] = [cross]
  ): GapCandidate => {
    let lane1 = Infinity;
    let lane2 = -Infinity;

    for (const rect of lane) {
      lane1 = Math.min(lane1, horizontal ? rect.top : rect.left);
      lane2 = Math.max(lane2, horizontal ? rect.bottom : rect.right);
    }

    return horizontal
      ? {
          index,
          x1: main,
          x2: main,
          y1: cross.top,
          y2: cross.bottom,
          laneStart: lane1,
          laneEnd: lane2,
        }
      : {
          index,
          x1: cross.left,
          x2: cross.right,
          y1: main,
          y2: main,
          laneStart: lane1,
          laneEnd: lane2,
        };
  };

  const candidates: GapCandidate[] = [];

  const createEdgeCandidate = (
    index: number,
    rect: DOMRect,
    side: "before" | "after"
  ) => {
    const main = side === "before" ? start(rect) : end(rect);

    return getGapAt(index, main, rect);
  };

  // Generate a list of all drop candidates.
  for (let i = 0; i <= rendered.length; i++) {
    const prev = rendered[i - 1];
    const next = rendered[i];

    if (!next) {
      // After the last rendered item. Get the end of the previous item as the drop position.
      candidates.push(createEdgeCandidate(prev.index + 1, prev.rect, "after"));
    } else if (!prev) {
      // Before the first rendered item. Get the start of the next item as the drop position.
      candidates.push(createEdgeCandidate(next.index, next.rect, "before"));
    } else if (next.index - prev.index > 1) {
      // The items between these two are virtualized out: expose both edges as
      // separate drop positions.
      candidates.push(createEdgeCandidate(prev.index + 1, prev.rect, "after"));
      candidates.push(createEdgeCandidate(next.index, next.rect, "before"));
    } else if (
      reversed
        ? end(prev.rect) < start(next.rect)
        : end(prev.rect) > start(next.rect)
    ) {
      // The flow wraps between these items (row wrap in horizontal zones,
      // column wrap in vertical ones like `flex-flow: column wrap`): expose the
      // end of the previous lane and the start of the next as the same drop
      // position (they share the same index).
      candidates.push(createEdgeCandidate(next.index, next.rect, "before"));
      candidates.push(createEdgeCandidate(next.index, prev.rect, "after"));
    } else {
      // Adjacent items: expose midpoint of the gap between them as the drop position.
      const mid = (end(prev.rect) + start(next.rect)) / 2;

      candidates.push(
        getGapAt(next.index, mid, next.rect, [prev.rect, next.rect])
      );
    }
  }

  // The pointer's cross-axis coordinate, used to test lane membership.
  const cross = horizontal ? pointer.y : pointer.x;

  let nearest: GapCandidate | null = null;
  let nearestDistance = Infinity;
  let nearestInLane: GapCandidate | null = null;
  let nearestInLaneDistance = Infinity;

  for (const candidate of candidates) {
    const distance = getDistanceToSegment(pointer, candidate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }

    if (
      cross >= candidate.laneStart &&
      cross <= candidate.laneEnd &&
      distance < nearestInLaneDistance
    ) {
      nearestInLaneDistance = distance;
      nearestInLane = candidate;
    }
  }

  return (nearestInLane ?? nearest)?.index ?? null;
};
