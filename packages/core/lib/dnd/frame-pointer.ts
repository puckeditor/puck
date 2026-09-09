type Point = { x: number; y: number };

/**
 * Maps a position  from top-window coordinates into Puck's preview iframe
 * coordinate space, accounting for the iframe's scale.
 *
 * Only converts when `targetEl` lives inside the iframe; otherwise the position
 * is already in the correct space and is returned unchanged.
 *
 * @param targetEl - Used to check whether the target is inside the preview iframe.
 * @param position - The position in top-window coordinates.
 * @returns The position in the iframe's coordinate space, or unchanged when the target is outside the iframe.
 */
export const getFramePointer = (targetEl: Element, position: Point): Point => {
  const frameEl = document.querySelector(
    "iframe#preview-frame"
  ) as HTMLIFrameElement | null;

  // If there's no frame or the target element is not inside the frame, return the original position
  if (!frameEl || targetEl.ownerDocument !== frameEl.contentDocument) {
    return position;
  }

  const rect = frameEl.getBoundingClientRect();
  const scale = rect.width / (frameEl.contentWindow?.innerWidth || 1);

  if (!(scale > 0)) {
    return position;
  }

  return {
    x: (position.x - rect.left) / scale,
    y: (position.y - rect.top) / scale,
  };
};
