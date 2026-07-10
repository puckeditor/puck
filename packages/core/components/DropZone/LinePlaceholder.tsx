import { CSSProperties, RefObject, useLayoutEffect, useState } from "react";
import { getClassNameFactory } from "../../lib";
import type { DragAxis } from "../../types";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("DropZone", styles);
const LINE_PLACEHOLDER_SIZE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * A thin line rendered at the insertion point during static drags.
 * Positioned from neighboring item rects so it never affects zone layout.
 */
export const LinePlaceholder = ({
  zoneRef,
  contentIds,
  index,
  dragAxis,
}: {
  zoneRef: RefObject<HTMLDivElement | null>;
  contentIds: string[];
  index: number;
  dragAxis: DragAxis;
}) => {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    const zoneEl = zoneRef.current;

    if (!zoneEl) return;

    const win = zoneEl.ownerDocument.defaultView;
    const styleOf = (el?: Element | null) =>
      el && win ? win.getComputedStyle(el) : undefined;
    const px = (value?: string) => parseFloat(value ?? "") || 0;
    const getItem = (itemIndex: number) => {
      const id = contentIds[itemIndex];

      if (typeof id === "undefined") return undefined;

      // Exclude the flying drag element: in same-zone line drags the item's
      // in-flow position is represented by its placeholder clone.
      const el = zoneEl.querySelector(
        `:scope > [data-puck-component="${CSS.escape(
          id
        )}"]:not([data-dnd-dragging])`
      );

      if (!el) return undefined;

      return { el, rect: el.getBoundingClientRect() };
    };

    const zoneRect = zoneEl.getBoundingClientRect();
    const zoneStyle = styleOf(zoneEl);
    const prev = getItem(index - 1);
    const next = getItem(index);
    const closest = next ?? prev;
    const size = LINE_PLACEHOLDER_SIZE;

    if (dragAxis === "y") {
      const rowGap = px(zoneStyle?.rowGap);

      // Vertical flows insert between rows. At the edges, respect the zone
      // gap or sibling margin; in empty zones, start after the zone padding.
      const y = next
        ? prev && prev.rect.bottom <= next.rect.top
          ? (prev.rect.bottom + next.rect.top) / 2
          : next.rect.top -
            Math.max(px(styleOf(next.el)?.marginTop), rowGap) / 2
        : prev
        ? prev.rect.bottom +
          Math.max(px(styleOf(prev.el)?.marginBottom), rowGap) / 2
        : zoneRect.top + px(zoneStyle?.paddingTop);

      setStyle({
        left:
          (closest?.rect.left ?? zoneRect.left + px(zoneStyle?.paddingLeft)) -
          zoneRect.left +
          zoneEl.scrollLeft,
        width:
          closest?.rect.width ??
          zoneRect.width -
            px(zoneStyle?.paddingLeft) -
            px(zoneStyle?.paddingRight),
        top: clamp(
          y - zoneRect.top + zoneEl.scrollTop - size / 2,
          0,
          zoneEl.scrollHeight - size
        ),
        height: size,
      });
    } else {
      const columnGap = px(zoneStyle?.columnGap);

      // Horizontal and grid flows use a vertical caret at the insertion edge.
      // Row wraps and edge positions respect the zone gap or sibling margin.
      const x = next
        ? prev && prev.rect.right <= next.rect.left
          ? (prev.rect.right + next.rect.left) / 2
          : next.rect.left -
            Math.max(px(styleOf(next.el)?.marginLeft), columnGap) / 2
        : prev
        ? prev.rect.right +
          Math.max(px(styleOf(prev.el)?.marginRight), columnGap) / 2
        : zoneRect.left + px(zoneStyle?.paddingLeft);

      setStyle({
        top:
          (closest?.rect.top ?? zoneRect.top + px(zoneStyle?.paddingTop)) -
          zoneRect.top +
          zoneEl.scrollTop,
        height:
          closest?.rect.height ??
          zoneRect.height -
            px(zoneStyle?.paddingTop) -
            px(zoneStyle?.paddingBottom),
        left: clamp(
          x - zoneRect.left + zoneEl.scrollLeft - size / 2,
          0,
          zoneEl.scrollWidth - size
        ),
        width: size,
      });
    }
  }, [zoneRef, contentIds, index, dragAxis]);

  if (!style) return null;

  return (
    <div
      className={getClassName("linePlaceholder")}
      style={style}
      data-puck-line-placeholder
    />
  );
};
