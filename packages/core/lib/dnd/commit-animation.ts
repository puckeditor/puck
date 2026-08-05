import { getComponentSelector, getZoneSelector } from "../dom-selectors";

export const COMMIT_ANIMATION: KeyframeAnimationOptions = {
  duration: 250,
  easing: "ease",
};

const MAX_COMMIT_WAIT_FRAMES = 10;

export const prefersReducedMotion = (doc: Document) =>
  doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ??
  false;

type WaitForCommitOptions = {
  /** The zones to check for the item. */
  zones: string[];
  /** The id of the item to wait for. If not provided, the first item that is not in the initial expected order will be used. */
  itemId?: string;
  /** The zone the item is moved or inserted into. */
  targetZone: string;
  /** A function that returns the expected order of items in the target zone. */
  getExpectedOrder: () => string[];
  /** The initial expected order of items in the target zone. Defaults to an empty array. */
  initialExpectedOrder?: string[];
};

/**
 * Dispatches a callback when an item has been moved or inserted into a target zone
 * and rendered in the DOM.
 *
 * @param doc The document to query for the target zone and item.
 * @param options The options for waiting for the commit.
 * @param callback The callback to invoke when the item has been committed.
 */
export const waitForCommit = (
  doc: Document,
  {
    zones,
    itemId,
    targetZone,
    getExpectedOrder,
    initialExpectedOrder = [],
  }: WaitForCommitOptions,
  callback: (committed: HTMLElement | null) => void
) => {
  const initialIds = new Set(initialExpectedOrder);

  let attempts = 0;

  const tick = () => {
    const zoneEl = doc.querySelector(getZoneSelector(targetZone));

    const expected = getExpectedOrder();

    const committedItemId =
      itemId ?? expected.find((id) => !initialIds.has(id));

    const committed = committedItemId
      ? zoneEl?.querySelector<HTMLElement>(
          `:scope > ${getComponentSelector(
            committedItemId
          )}:not([data-dnd-dragging]):not([data-dnd-placeholder])`
        ) ?? null
      : null;

    const rendered = zoneEl
      ? Array.from(
          zoneEl.querySelectorAll(
            ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-dnd-placeholder])"
          )
        ).map((el) => el.getAttribute("data-puck-component"))
      : [];

    const renderedIds = new Set(rendered);

    const expectedRendered = expected.filter((id) => renderedIds.has(id));

    const orderMatches =
      rendered.length === expectedRendered.length &&
      rendered.every((id, index) => id === expectedRendered[index]);

    const leftOtherZones = zones.every(
      (zone) =>
        zone === targetZone ||
        !committedItemId ||
        !doc.querySelector(
          `${getZoneSelector(zone)} > ${getComponentSelector(committedItemId)}`
        )
    );

    if (
      (!committed || !orderMatches || !leftOtherZones) &&
      attempts < MAX_COMMIT_WAIT_FRAMES
    ) {
      attempts++;
      requestAnimationFrame(tick);

      return;
    }

    callback(committed);
  };

  requestAnimationFrame(tick);
};
