import { CSSProperties, RefObject, useLayoutEffect, useState } from "react";

import { getClassNameFactory } from "../../lib";
import { clamp } from "../../lib/math";
import {
  getItemEdgeAccessors,
  resolveZoneFlow,
} from "../../lib/dnd/resolve-flow";
import { getComponentSelector } from "../../lib/dom-selectors";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("DropZone", styles);

const LINE_SIZE = "var(--puck-line-placeholder-width, 2px)";

/**
 * Renders the line preview
 */
export const LinePlaceholder = ({
  zoneRef,
  contentIds,
  index,
}: {
  zoneRef: RefObject<HTMLDivElement | null>;
  contentIds: string[];
  index: number;
}) => {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    const zoneEl = zoneRef.current;
    const win = zoneEl?.ownerDocument.defaultView;

    if (!zoneEl || !win) return;

    const styleOf = (el?: Element | null) =>
      el ? win.getComputedStyle(el) : undefined;
    const px = (value?: string) => parseFloat(value ?? "") || 0;

    const getItem = (itemIndex: number) => {
      const id = contentIds[itemIndex];

      if (typeof id === "undefined") return undefined;

      // Exclude the flying drag element: in same-zone line drags the item's
      // in-flow position is represented by its placeholder clone.
      const el = zoneEl.querySelector(
        `:scope > ${getComponentSelector(id)}:not([data-dnd-dragging])`
      );

      if (!el) return undefined;

      return { el, rect: el.getBoundingClientRect() };
    };

    const zoneRect = zoneEl.getBoundingClientRect();
    const zoneStyle = win.getComputedStyle(zoneEl);
    const prev = getItem(index - 1);
    const next = getItem(index);
    const closest = next ?? prev;

    const zoneFlow = resolveZoneFlow(zoneEl, win, zoneStyle);

    const { horizontal, reversed, forward, start, end, isBefore } =
      getItemEdgeAccessors(zoneFlow);

    const gap = px(horizontal ? zoneStyle.columnGap : zoneStyle.rowGap);
    const marginOf = (
      el: Element | null | undefined,
      edge: "start" | "end"
    ) => {
      const side =
        (edge === "start") === !reversed
          ? horizontal
            ? "marginLeft"
            : "marginTop"
          : horizontal
          ? "marginRight"
          : "marginBottom";

      return px(styleOf(el)?.[side]);
    };

    const borderLeft = px(zoneStyle.borderLeftWidth);
    const borderTop = px(zoneStyle.borderTopWidth);
    const borderRight = px(zoneStyle.borderRightWidth);
    const borderBottom = px(zoneStyle.borderBottomWidth);

    // The caret's position along the main axis, in viewport coordinates.
    let main: number;

    if (next) {
      if (prev && isBefore(end(prev.rect), start(next.rect))) {
        // Between two items: the centre of the gap.
        main = (end(prev.rect) + start(next.rect)) / 2;
      } else {
        // Before `next`: back off half the sibling margin or zone gap.
        main =
          start(next.rect) -
          forward * (Math.max(marginOf(next.el, "start"), gap) / 2);
      }
    } else if (prev) {
      // After the last item.
      main =
        end(prev.rect) +
        forward * (Math.max(marginOf(prev.el, "end"), gap) / 2);
    } else {
      // Empty zone: start after the zone's leading border and padding.
      main = horizontal
        ? reversed
          ? zoneRect.right - borderRight - px(zoneStyle.paddingRight)
          : zoneRect.left + borderLeft + px(zoneStyle.paddingLeft)
        : reversed
        ? zoneRect.bottom - borderBottom - px(zoneStyle.paddingBottom)
        : zoneRect.top + borderTop + px(zoneStyle.paddingTop);
    }

    if (horizontal) {
      // Vertical caret: centred at `main` on the x axis, spanning the
      // cross-axis height of the neighbouring item (or the zone's content box).
      setStyle({
        top:
          (closest?.rect.top ??
            zoneRect.top + borderTop + px(zoneStyle.paddingTop)) -
          zoneRect.top +
          zoneEl.scrollTop -
          borderTop,
        height:
          closest?.rect.height ??
          zoneRect.height -
            borderTop -
            borderBottom -
            px(zoneStyle.paddingTop) -
            px(zoneStyle.paddingBottom),
        left: clamp(
          main - zoneRect.left + zoneEl.scrollLeft - borderLeft,
          0,
          zoneEl.scrollWidth
        ),
        width: LINE_SIZE,
        transform: "translateX(-50%)",
      });
    } else {
      // Horizontal caret: centred at `main` on the y axis, spanning the
      // cross-axis width.
      setStyle({
        left:
          (closest?.rect.left ??
            zoneRect.left + borderLeft + px(zoneStyle.paddingLeft)) -
          zoneRect.left +
          zoneEl.scrollLeft -
          borderLeft,
        width:
          closest?.rect.width ??
          zoneRect.width -
            borderLeft -
            borderRight -
            px(zoneStyle.paddingLeft) -
            px(zoneStyle.paddingRight),
        top: clamp(
          main - zoneRect.top + zoneEl.scrollTop - borderTop,
          0,
          zoneEl.scrollHeight
        ),
        height: LINE_SIZE,
        transform: "translateY(-50%)",
      });
    }
  }, [zoneRef, contentIds, index]);

  if (!style) return null;

  return (
    <div
      className={getClassName("linePlaceholder")}
      style={style}
      data-puck-line-placeholder
    />
  );
};
