import type { DragDropManager } from "@dnd-kit/dom";
import { useCallback, useEffect, useRef } from "react";
import type { StoreApi } from "zustand";
import { getFrame } from "../../lib/get-frame";
import { getFramePointer, getNearestGapIndex } from "../../lib/dnd/nearest-gap";
import { useAppStoreApi } from "../../store";
import type { ZoneStore } from "../DropZone/context";

const getTargetIndex = (
  zoneEl: Element,
  manager: DragDropManager,
  contentIds: string[]
) =>
  getNearestGapIndex(
    zoneEl,
    getFramePointer(zoneEl, manager.dragOperation.position.current),
    contentIds
  );

/** Owns the DOM state, pointer tracking and scroll handling for line drags. */
export const useLinePlaceholder = (zoneStore: StoreApi<ZoneStore>) => {
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
      const zoneEl = getFrame()?.querySelector(
        `[data-puck-dropzone="${zone}"]`
      );

      if (!zoneEl) return null;

      return getTargetIndex(
        zoneEl,
        manager,
        appStore.getState().state.indexes.zones[zone]?.contentIds ?? []
      );
    },
    [appStore]
  );

  const update = useCallback(
    (manager: DragDropManager) => {
      const { previewIndex = {} } = zoneStore.getState();
      const linePreview = Object.values(previewIndex).find(
        (preview) => preview?.linePlaceholder
      );

      if (!linePreview) return;

      const zoneEl = getFrame()?.querySelector(
        `[data-puck-dropzone="${linePreview.zone}"]`
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

      const nearestIndex = getNearestGapIndex(
        zoneEl,
        pointer,
        appStore.getState().state.indexes.zones[linePreview.zone]?.contentIds ??
          []
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
