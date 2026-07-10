type Point = { x: number; y: number };

type GapCandidate = {
  index: number;
  // A line segment describing the gap
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const distanceToSegment = (point: Point, gap: GapCandidate) => {
  const x = Math.max(gap.x1, Math.min(gap.x2, point.x));
  const y = Math.max(gap.y1, Math.min(gap.y2, point.y));

  return Math.hypot(point.x - x, point.y - y);
};

/**
 * Maps a drag position from top-window coordinates (as tracked by dnd-kit's
 * sensors) into the coordinate space of the element's frame, accounting for
 * the canvas iframe scale.
 */
export const getFramePointer = (targetEl: Element, position: Point): Point => {
  const frameEl = document.querySelector(
    "iframe#preview-frame"
  ) as HTMLIFrameElement | null;

  if (!frameEl || targetEl.ownerDocument !== frameEl.contentDocument) {
    return position;
  }

  const rect = frameEl.getBoundingClientRect();
  const scale = rect.width / (frameEl.contentWindow?.innerWidth || 1);

  return {
    x: (position.x - rect.left) / scale,
    y: (position.y - rect.top) / scale,
  };
};

/**
 * Returns the insertion index whose gap is nearest to the pointer, using the
 * same geometry as the line placeholder indicator. This is more predictable
 * than directional midpoint collisions for cross-zone drags, where items
 * don't move out of the way and the drag shape's size is unrelated to the
 * target zone's items.
 *
 * Rendered items are mapped to their real content indices via `contentIds`:
 * virtualized zones only render a window of their content, so DOM positions
 * can't be used as indices directly.
 */
export const getNearestGapIndex = (
  zoneEl: Element,
  pointer: Point,
  contentIds: string[]
): number | null => {
  const win = zoneEl.ownerDocument.defaultView;

  if (!win) return null;

  const rendered = Array.from(
    zoneEl.querySelectorAll(
      ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-dnd-placeholder])"
    )
  )
    .map((el) => ({
      index: contentIds.indexOf(el.getAttribute("data-puck-component") ?? ""),
      rect: el.getBoundingClientRect(),
    }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (rendered.length === 0) return 0;

  const style = win.getComputedStyle(zoneEl);
  const horizontalFlow =
    style.display === "grid" ||
    (style.display === "flex" && style.flexDirection.startsWith("row"));

  const candidates: GapCandidate[] = [];

  const edgeCandidate = (
    index: number,
    rect: DOMRect,
    side: "before" | "after"
  ) => {
    if (horizontalFlow) {
      const x = side === "before" ? rect.left : rect.right;

      candidates.push({ index, x1: x, x2: x, y1: rect.top, y2: rect.bottom });
    } else {
      const y = side === "before" ? rect.top : rect.bottom;

      candidates.push({ index, y1: y, y2: y, x1: rect.left, x2: rect.right });
    }
  };

  for (let i = 0; i <= rendered.length; i++) {
    const prev = rendered[i - 1];
    const next = rendered[i];

    if (!next) {
      // After the last rendered item
      edgeCandidate(prev.index + 1, prev.rect, "after");
    } else if (!prev) {
      // Before the first rendered item
      edgeCandidate(next.index, next.rect, "before");
    } else if (next.index - prev.index > 1) {
      // The items between these two are virtualized out: expose both edges
      // as separate insertion points
      edgeCandidate(prev.index + 1, prev.rect, "after");
      edgeCandidate(next.index, next.rect, "before");
    } else if (horizontalFlow) {
      const wraps = prev.rect.right > next.rect.left;

      if (wraps) {
        // Row wraps expose both the end of the previous row and the start
        // of the next as the same index
        edgeCandidate(next.index, next.rect, "before");
        edgeCandidate(next.index, prev.rect, "after");
      } else {
        const x = (prev.rect.right + next.rect.left) / 2;

        candidates.push({
          index: next.index,
          x1: x,
          x2: x,
          y1: next.rect.top,
          y2: next.rect.bottom,
        });
      }
    } else {
      const y = (prev.rect.bottom + next.rect.top) / 2;

      candidates.push({
        index: next.index,
        y1: y,
        y2: y,
        x1: next.rect.left,
        x2: next.rect.right,
      });
    }
  }

  let nearest: GapCandidate | null = null;
  let nearestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = distanceToSegment(pointer, candidate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }
  }

  return nearest?.index ?? null;
};
