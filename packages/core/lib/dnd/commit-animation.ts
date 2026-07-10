export const COMMIT_ANIMATION: KeyframeAnimationOptions = {
  duration: 250,
  easing: "ease",
};

const MAX_COMMIT_WAIT_FRAMES = 10;

export const prefersReducedMotion = (doc: Document) =>
  doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ??
  false;

type WaitForCommitOptions = {
  zones: string[];
  itemId?: string;
  targetZone: string;
  getExpectedOrder: () => string[];
  initialExpectedOrder?: string[];
};

/**
 * Waits for a dispatched move or insert to render. The committed item must
 * appear in the target zone's expected order and leave every other zone.
 * Inserted item ids are inferred by comparing the pre- and post-commit order.
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
  let attempts = 0;

  const tick = () => {
    const zoneEl = doc.querySelector(`[data-puck-dropzone="${targetZone}"]`);
    const expected = getExpectedOrder();
    const committedItemId =
      itemId ?? expected.find((id) => !initialExpectedOrder.includes(id));
    const committed = committedItemId
      ? zoneEl?.querySelector<HTMLElement>(
          `:scope > [data-puck-component="${committedItemId}"]:not([data-dnd-dragging]):not([data-dnd-placeholder])`
        ) ?? null
      : null;
    const rendered = zoneEl
      ? Array.from(
          zoneEl.querySelectorAll(
            ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-dnd-placeholder])"
          )
        ).map((el) => el.getAttribute("data-puck-component"))
      : [];
    const expectedRendered = expected.filter((id) => rendered.includes(id));
    const orderMatches =
      rendered.length === expectedRendered.length &&
      rendered.every((id, index) => id === expectedRendered[index]);
    const leftOtherZones = zones.every(
      (zone) =>
        zone === targetZone ||
        !committedItemId ||
        !doc.querySelector(
          `[data-puck-dropzone="${zone}"] > [data-puck-component="${committedItemId}"]`
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
