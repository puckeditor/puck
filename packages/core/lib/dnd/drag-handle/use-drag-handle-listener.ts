import { useCallback, useEffect, useRef } from "react";

import { useAppStore } from "../../../store";
import { dragHandleSelector } from "../../dom-selectors";
import { getFrame } from "../../get-frame";

export type UseDragHandleListenerAPI = {
  /** Checks whether the user is dragging from the handle. */
  getIsDraggingFromHandle: () => boolean;
};

/**
 * Tracks whether the current drag started from a drag handle.
 *
 * For future reference:
 *
 * This is needed because dnd-kit merges all events from all available documents and overrides any iframe events
 * with the event from the host document.
 * That makes it so that when a drag starts in an iframe, the event we get in dnd-kit event listeners
 * is the one from the host document, which only knows about the target being an iframe and not if it was a drag handle or not.
 *
 * With this hook we can track if the drag started from the handle and use that from the dnd-kit event listener.
 */
export const useDragHandleListener = (): UseDragHandleListenerAPI => {
  const status = useAppStore((s) => s.status);
  const pressingHandle = useRef(false);

  useEffect(() => {
    // Pointer events raised inside the iframe never reach the host document,
    // so listen on whichever document actually renders the handles.
    const doc = getFrame();

    if (!doc) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Element | null;

      // Re-evaluated on every press rather than only set on handles, so a press
      // that never reports a release can't leave a stale `true` behind.
      pressingHandle.current = !!target?.closest?.(dragHandleSelector);
    };

    const onPointerRelease = () => {
      pressingHandle.current = false;
    };

    // Capture, because dnd-kit stops propagation of these events while a drag
    // is live.
    const options = { capture: true };

    doc.addEventListener("pointerdown", onPointerDown, options);
    doc.addEventListener("pointerup", onPointerRelease, options);
    doc.addEventListener("pointercancel", onPointerRelease, options);

    return () => {
      doc.removeEventListener("pointerdown", onPointerDown, options);
      doc.removeEventListener("pointerup", onPointerRelease, options);
      doc.removeEventListener("pointercancel", onPointerRelease, options);
    };
    // The frame document is replaced as the preview mounts, so re-resolve it
  }, [status]);

  const getIsDraggingFromHandle = useCallback(() => pressingHandle.current, []);

  return { getIsDraggingFromHandle };
};
