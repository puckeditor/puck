import { CSSProperties, Ref, RefObject, useEffect, useRef } from "react";
import {
  hidePopover,
  showPopover,
  supportsPopover,
} from "@dnd-kit/dom/utilities";

import { useContextStore } from "../../lib/use-context-store";

import { ZoneStoreContext } from "../DropZone/context";

type UseDragHandleProps = {
  /** The id of the component the drag handle should be attached to */
  componentId: string;
  /** Ref to the draggable component element */
  componentRef: RefObject<HTMLElement | null>;
  /** Function to get the current styles of the draggable component */
  getComponentStyle: () => CSSProperties | undefined;
};

type UseDragHandleAPI<T extends HTMLElement> = {
  /** Ref to assign to the draggable component overlay element */
  overlayRef: Ref<T | null>;
  /** Indicates whether the drag handle is the source of the current drag */
  isHandleDragSource: boolean;
};

/**
 * Keeps track and positions the overlay element (with its drag handle) for a draggable component when the drag handle is the source of the drag.
 *
 * @returns The ref to assign to the overlay element and a boolean indicating if the drag handle is the source of the current drag.
 */
const useDragHandle = <OverlayElement extends HTMLElement>({
  componentId,
  componentRef,
  getComponentStyle: getStyle,
}: UseDragHandleProps): UseDragHandleAPI<OverlayElement> => {
  const overlayRef = useRef<OverlayElement | null>(null);

  const isHandleDragSource = useContextStore(
    ZoneStoreContext,
    (s) => s.draggingFromHandle && s.draggedItem?.id === componentId
  );

  useEffect(() => {
    if (!isHandleDragSource) return;

    const componentElement = componentRef?.current;
    const componentWindow = componentElement?.ownerDocument.defaultView;

    if (!componentElement || !componentWindow) return;

    let frame = 0;

    // Sync the overlay element's position and size with the draggable component's bounding rect while dragging from the handle.
    const syncDraggedComponent = () => {
      const overlay = overlayRef.current;

      if (componentElement.hasAttribute("data-dnd-dragging") && overlay) {
        const rect = componentElement.getBoundingClientRect();

        Object.assign(overlay.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          height: `${rect.height}px`,
          width: `${rect.width}px`,
          position: "fixed",
        });

        if (supportsPopover(overlay)) {
          overlay.setAttribute("popover", "manual");
          showPopover(overlay);
        }
      }
    };

    // Drop animations can change the geometry of the dragged component without mutating its inline styles.
    // Track those changes and update the overlay element accordingly.
    const trackDropAnimation = () => {
      frame = 0;
      syncDraggedComponent();

      if (componentElement.hasAttribute("data-dnd-dropping")) {
        frame = componentWindow.requestAnimationFrame(trackDropAnimation);
      }
    };

    // Pointer translations are written by dnd-kit during its own rAF. Respond
    // to that write so the separate action-bar portal moves in the same frame.
    const observer = new componentWindow.MutationObserver(() => {
      syncDraggedComponent();

      if (!frame && componentElement.hasAttribute("data-dnd-dropping")) {
        frame = componentWindow.requestAnimationFrame(trackDropAnimation);
      }
    });

    observer.observe(componentElement, {
      attributes: true,
      // Only observe style changes and the data-dnd-dropping since that's what we care about in syncDraggedComponent
      attributeFilter: ["style", "data-dnd-dropping"],
    });

    // Initial sync to ensure the overlay is positioned correctly at the start of the drag.
    syncDraggedComponent();

    return () => {
      observer.disconnect();
      componentWindow.cancelAnimationFrame(frame);

      const overlay = overlayRef.current;
      const nextStyle = getStyle();

      if (overlay) {
        hidePopover(overlay);
        overlay.removeAttribute("popover");
      }

      if (overlay && nextStyle) {
        Object.assign(overlay.style, nextStyle);
        overlay.style.position = nextStyle.position ?? "";
      }
    };
  }, [
    getStyle,
    isHandleDragSource,
    componentRef.current, // Retarget if an inline component replaces its root mid-drag
  ]);

  return { overlayRef, isHandleDragSource };
};

export default useDragHandle;
