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
};

/**
 * Returns the insertion index in the content ids whose gap is nearest the pointer in the screen.
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
  // full cross-axis extent of the closest item (neighbor).
  const getGapAt = (
    index: number,
    main: number,
    cross: DOMRect
  ): GapCandidate =>
    horizontal
      ? { index, x1: main, x2: main, y1: cross.top, y2: cross.bottom }
      : { index, x1: cross.left, x2: cross.right, y1: main, y2: main };

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
      horizontal &&
      (reversed
        ? end(prev.rect) < start(next.rect)
        : end(prev.rect) > start(next.rect))
    ) {
      // The row wraps between these items: expose the end of the previous row
      // and the start of the next as the same drop position (they share the same index).
      candidates.push(createEdgeCandidate(next.index, next.rect, "before"));
      candidates.push(createEdgeCandidate(next.index, prev.rect, "after"));
    } else {
      // Adjacent items: expose midpoint of the gap between them as the drop position.
      const mid = (end(prev.rect) + start(next.rect)) / 2;

      candidates.push(getGapAt(next.index, mid, next.rect));
    }
  }

  let nearest: GapCandidate | null = null;
  let nearestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = getDistanceToSegment(pointer, candidate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }
  }

  return nearest?.index ?? null;
};
