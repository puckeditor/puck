import { getDeepDir } from "../get-deep-dir";

/**
 * How items are laid out along a drop zone's element main axis:
 */
export type ZoneFlow = {
  /**
   * The axis along which items are laid out in the zone.
   * - `"x"` — Horizontal, items sit side by side (insertion carets are a vertical line).
   * - `"y"` — Vertical, items stack top to bottom (insertion carets are a horizontal line).
   */
  axis: "x" | "y";
  /**
   * True when index order runs against the western reading direction
   * along that axis (e.g. rtl rows, `row-reverse`, `column-reverse`), so an
   * earlier index ("before") sits at the right/bottom edge instead of left/top.
   */
  reversed: boolean;
};

// Counts explicit grid tracks, ignoring bracketed `[line-name]` tokens (which
// the CSSOM serializes into the computed value). A missing template ("none")
// means the grid has a single implicit track, so it returns 0.
const countTracks = (template: string) => {
  const tracks = template.replace(/\[[^\]]*\]/g, " ").trim();

  return tracks && tracks !== "none" ? tracks.split(/\s+/).length : 0;
};

/**
 * Resolves a drop zone's element layout flow from its computed styles.
 *
 * Handles:
 *  - flex (incl. `inline-flex` and `*-reverse`),
 *  - grid (incl. `inline-grid`,
 *  - single implicit/explicit columns and column auto-flow),
 *  - text direction.
 *
 * All with RTL support. Block and everything else is treated as a vertical stack in document order.
 *
 * @param zoneEl The dropzone element in the DOM. This contains the items with the given flow.
 * @param win The window object of the zone element.
 * @param style The computed style of the zone element. If not provided, it will be computed from the `zoneEl` param.
 * @returns The flow of the drop zone.
 */
export const resolveZoneFlow = (
  zoneEl: Element,
  win: Window,
  style: CSSStyleDeclaration = win.getComputedStyle(zoneEl)
): ZoneFlow => {
  const display = style.display;
  const rtl = getDeepDir(zoneEl) === "rtl";

  if (display === "flex" || display === "inline-flex") {
    const direction = style.flexDirection;

    if (direction.startsWith("row")) {
      const reverseDirection = direction === "row-reverse";

      // rtl flips a row's visual order; `row-reverse` flips it again.
      const isReverse = rtl ? !reverseDirection : reverseDirection;

      return { axis: "x", reversed: isReverse };
    }

    return { axis: "y", reversed: direction === "column-reverse" };
  }

  if (display === "grid" || display === "inline-grid") {
    // A grid stacks vertically only when it fills a single (implicit or
    // explicit) column row-by-row. Multiple columns, or column auto-flow, lay
    // items out horizontally.
    const columnFlow = style.gridAutoFlow.startsWith("column");
    const horizontal = columnFlow || countTracks(style.gridTemplateColumns) > 1;

    return horizontal
      ? { axis: "x", reversed: rtl }
      : { axis: "y", reversed: false };
  }

  // Block and everything else: a vertical stack in document order.
  return { axis: "y", reversed: false };
};

/**
 * The accessors for a drop zone's item edges along its resolved flow.
 */
export type ItemEdgeAccessors = {
  /** True when the zone is horizontal (items sit side by side). */
  horizontal: boolean;
  /** True when index order runs against the western reading direction along that axis. */
  reversed: boolean;
  /** The viewport direction in which the item index increases (reverse === -1, !reverse === 1). */
  forward: 1 | -1;
  /**
   * Returns the coordinate of an item's leading ("before") edge, for the given drop zone flow.
   * @param rect The item's bounding client rect.
   * @returns The coordinate of the leading edge.
   */
  start: (rect: DOMRect) => number;
  /**
   * Returns the coordinate of an item's trailing ("after") edge, for the given drop zone flow.
   * @param rect The item's bounding client rect.
   * @returns The coordinate of the trailing edge.
   */
  end: (rect: DOMRect) => number;
  /**
   * Returns true when a coordinate sits before another along the given drop zone flow.
   * @param a The first coordinate.
   * @param b The second coordinate.
   * @returns True if `a` is before `b` along the flow direction, false otherwise.
   */
  isBefore: (a: number, b: number) => boolean;
};

/**
 * Creates the accessors for a drop zone's item edges along its resolved flow.
 *
 * @param flow The resolved flow of the drop zone.
 * @returns The accessors for the drop zone's item edges.
 */
export const getItemEdgeAccessors = ({
  axis,
  reversed,
}: ZoneFlow): ItemEdgeAccessors => {
  const horizontal = axis === "x";
  // The viewport direction in which the item index increases.
  const forward = reversed ? -1 : 1;

  // Main-axis coordinate of an item's leading ("before") and trailing
  // ("after") edges, honoring reversed flows where an earlier index sits at
  // the right/bottom edge.
  const leading = (rect: DOMRect) =>
    horizontal
      ? reversed
        ? rect.right
        : rect.left
      : reversed
      ? rect.bottom
      : rect.top;
  const trailing = (rect: DOMRect) =>
    horizontal
      ? reversed
        ? rect.left
        : rect.right
      : reversed
      ? rect.top
      : rect.bottom;
  // Whether `a` sits before `b` along the flow direction.
  const isBefore = (a: number, b: number) => (forward > 0 ? a <= b : a >= b);

  return {
    horizontal,
    reversed,
    forward,
    start: leading,
    end: trailing,
    isBefore,
  };
};
