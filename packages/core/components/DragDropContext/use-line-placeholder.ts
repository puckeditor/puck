import type { DragDropManager } from "@dnd-kit/dom";
import { useCallback, useEffect, useRef } from "react";
import type { StoreApi } from "zustand";
import { getFrame } from "../../lib/get-frame";
import { getNearestGapIndex } from "../../lib/dnd/nearest-gap";
import { getFramePointer } from "../../lib/dnd/frame-pointer";
import { getZoneContentIds } from "../../lib/get-zone-content-ids";
import { getZoneSelector } from "../../lib/dom-selectors";
import { useAppStoreApi } from "../../store";
import type { ZoneStore } from "../DropZone/context";

export type UseLinePlaceholderApi = {
  /**
   * Gets the closest target index for a given drop zone based on the cursor position.
   *
   * @param zone The ID of the drop zone to get the target index for.
   * @param manager The drag drop manager instance from dnd-kit.
   * @returns The index of the nearest gap within the zone, or null if not applicable.
   */
  getTargetIndex: (zone: string, manager: DragDropManager) => number | null;
  /**
   * Sets the active state of the line placeholder in the editor.
   *
   * @param active True if the line placeholder should be active. False otherwise.
   */
  setActive: (active: boolean) => void;
  /**
   * Tracks scroll events and updates the line placeholder position during drag operations.
   *
   * This is needed because dragging while scrolling happens with a fixed cursor position.
   * If not used, the line placeholder could be positioned incorrectly.
   *
   * @param manager The drag drop manager instance from dnd-kit.
   */
  startScrollTracking: (manager: DragDropManager) => void;
  /**
   * Stops updating the line placeholder position during drag operations.
   */
  stopScrollTracking: () => void;
  /**
   * Updates the line placeholder position based on the current cursor position.
   *
   * @param manager The drag drop manager instance from dnd-kit.
   */
  update: (manager: DragDropManager) => void;
};

/**
 * A hook to manage the line placeholder for drop zones during drag operations.
 *
 * @param zoneStore The Zustand store for managing dnd.
 * @returns An object with methods to manage the line placeholder.
 */
export const useLinePlaceholder = (
  zoneStore: StoreApi<ZoneStore>
): UseLinePlaceholderApi => {
  const appStore = useAppStoreApi();
  const scrollCleanup = useRef<(() => void) | null>(null);

  const setActive = useCallback((active: boolean) => {
    const entryEl = getFrame()?.querySelector("[data-puck-entry]");

    if (active) {
      entryEl?.setAttribute("data-puck-line-drag", "true");
    } else {
      entryEl?.removeAttribute("data-puck-line-drag");
    }
  }, []);

  const getTargetIndexForZone = useCallback(
    (zone: string, manager: DragDropManager) => {
      const zoneEl = getFrame()?.querySelector(getZoneSelector(zone));

      if (!zoneEl) return null;

      const pointerPosition = getFramePointer(
        zoneEl,
        manager.dragOperation.position.current
      );

      const zoneContentIds = getZoneContentIds(appStore.getState().state, zone);

      return getNearestGapIndex(zoneEl, pointerPosition, zoneContentIds);
    },
    [appStore]
  );

  const update = useCallback(
    (manager: DragDropManager) => {
      // Find the first zone with a line placeholder
      const { previewIndex = {} } = zoneStore.getState();
      const linePreview = Object.values(previewIndex).find(
        (preview) => preview?.linePlaceholder
      );

      if (!linePreview) return;

      // Find the zone element for the line placeholder
      // and check if the pointer is inside it.
      const zoneEl = getFrame()?.querySelector(
        getZoneSelector(linePreview.zone)
      );

      if (!zoneEl) return;

      const pointer = getFramePointer(
        zoneEl,
        manager.dragOperation.position.current
      );
      const zoneRect = zoneEl.getBoundingClientRect();
      const insideZone =
        pointer.x >= zoneRect.left &&
        pointer.x <= zoneRect.right &&
        pointer.y >= zoneRect.top &&
        pointer.y <= zoneRect.bottom;

      if (!insideZone) return;

      // Get the placeholder index for the current pointer position and update it
      const nearestIndex = getNearestGapIndex(
        zoneEl,
        pointer,
        getZoneContentIds(appStore.getState().state, linePreview.zone)
      );

      if (nearestIndex !== null && nearestIndex !== linePreview.index) {
        zoneStore.setState({
          previewIndex: {
            ...previewIndex,
            [linePreview.zone]: { ...linePreview, index: nearestIndex },
          },
        });
      }
    },
    [appStore, zoneStore]
  );

  const stopScrollTracking = useCallback(() => {
    scrollCleanup.current?.();
    scrollCleanup.current = null;
  }, []);

  const startScrollTracking = useCallback(
    (manager: DragDropManager) => {
      stopScrollTracking();

      const frameDoc = getFrame();

      if (!frameDoc) return;

      let raf: number | null = null;

      const handleScroll = () => {
        if (raf !== null) return;

        raf = requestAnimationFrame(() => {
          raf = null;
          update(manager);
        });
      };

      frameDoc.addEventListener("scroll", handleScroll, {
        capture: true,
        passive: true,
      });

      scrollCleanup.current = () => {
        if (raf !== null) cancelAnimationFrame(raf);

        frameDoc.removeEventListener("scroll", handleScroll, {
          capture: true,
        });
      };
    },
    [stopScrollTracking, update]
  );

  useEffect(() => stopScrollTracking, [stopScrollTracking]);

  return {
    getTargetIndex: getTargetIndexForZone,
    setActive,
    startScrollTracking,
    stopScrollTracking,
    update,
  };
};
