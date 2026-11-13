import {
  CSSProperties,
  Ref,
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  hidePopover,
  showPopover,
  supportsPopover,
} from "@dnd-kit/dom/utilities";

import { DRAG_HANDLE_ATTRIBUTE } from "../../dom-selectors";

type UseDragHandleProps = {
  /** Ref to the draggable component element */
  componentRef: RefObject<HTMLElement | null>;
  /** Function to get the current styles of the draggable component */
  getComponentStyle: () => CSSProperties | undefined;
  /** Whether this component is currently being dragged from its handle */
  draggingFromHandle: boolean;
};

type UseDragHandleAPI<OverlayElement extends Element> = {
  /** Ref object with the handle element (for dnd-kit) */
  handleRef: RefObject<Element | null>;
  /** Function to assign the handle element ref in elements (for the component that renders the handle) */
  assignHandleRef: (handleElement: Element | null) => void;
  /** Ref to assign to the draggable component overlay element the drag handle is positioned relative to */
  overlayRef: Ref<OverlayElement | null>;
};

/**
 * Registers a component's drag handle, and while that handle is dragging the
 * component, keeps the component's handle (overlay) positioned on top of it.
 */
const useDragHandle = <OverlayElement extends HTMLElement>({
  componentRef,
  getComponentStyle: getStyle,
  draggingFromHandle,
}: UseDragHandleProps): UseDragHandleAPI<OverlayElement> => {
  const overlayRef = useRef<OverlayElement | null>(null);

  const handleRef = useRef<Element | null>(null);

  const assignHandleRef = useCallback((handleElement: Element | null) => {
    // Unmark the previous handle element, if any, so a stale element can't be
    // mistaken for a live handle
    handleRef.current?.removeAttribute(DRAG_HANDLE_ATTRIBUTE);

    // Keep track of the current handle element
    handleRef.current = handleElement;

    // Mark the new handle element, so a press on it can be recognized from the
    // document listener without knowing which component it belongs to
    handleElement?.setAttribute(DRAG_HANDLE_ATTRIBUTE, "");
  }, []);

  useEffect(() => {
    if (!draggingFromHandle) return;

    const componentElement = componentRef?.current;
    const componentWindow = componentElement?.ownerDocument.defaultView;

    if (!componentElement || !componentWindow) return;

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

    // Pointer translations are written by dnd-kit during its own rAF. Respond
    // to that write so the separate action-bar portal moves in the same frame.
    const observer = new componentWindow.MutationObserver(() => {
      syncDraggedComponent();
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
    draggingFromHandle,
    componentRef.current, // Retarget if an inline component replaces its root mid-drag
  ]);

  return {
    handleRef,
    assignHandleRef,
    overlayRef,
  };
};

export default useDragHandle;
