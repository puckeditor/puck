import { getFrame } from "../get-frame";
import {
  COMMIT_ANIMATION,
  prefersReducedMotion,
  waitForCommit,
} from "./commit-animation";

/**
 * Captures sibling positions before a static drop commits and returns a
 * callback that FLIP-animates those siblings once the new layout renders.
 */
export const prepareCommitFlip = ({
  zones,
  itemId,
  targetZone,
  getExpectedOrder,
}: {
  zones: string[];
  itemId?: string;
  targetZone: string;
  getExpectedOrder: () => string[];
}): (() => void) => {
  const frame = getFrame();

  if (!frame || prefersReducedMotion(frame)) {
    return () => {};
  }

  const itemsSelector = Array.from(new Set(zones))
    .map(
      (zone) =>
        `[data-puck-dropzone="${zone}"] > [data-puck-component]:not([data-dnd-dragging]):not([data-dnd-placeholder])`
    )
    .join(", ");

  const capture = () => {
    const items = new Map<string, { el: HTMLElement; rect: DOMRect }>();

    frame.querySelectorAll<HTMLElement>(itemsSelector).forEach((el) => {
      const id = el.getAttribute("data-puck-component");

      if (id && id !== itemId) {
        items.set(id, { el, rect: el.getBoundingClientRect() });
      }
    });

    return items;
  };

  const first = capture();
  const initialExpectedOrder = getExpectedOrder();

  return () => {
    waitForCommit(
      frame,
      {
        zones,
        itemId,
        targetZone,
        getExpectedOrder,
        initialExpectedOrder,
      },
      () => {
        capture().forEach(({ el, rect }, id) => {
          const initial = first.get(id)?.rect;

          if (!initial) return;

          const dx = initial.x - rect.x;
          const dy = initial.y - rect.y;

          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

          el.animate(
            { translate: [`${dx}px ${dy}px 0`, "0px 0px 0"] },
            COMMIT_ANIMATION
          );
        });
      }
    );
  };
};
