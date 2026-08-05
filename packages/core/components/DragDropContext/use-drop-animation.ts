import { useCallback } from "react";
import type { StoreApi } from "zustand";
import type { DropAnimationFunction } from "@dnd-kit/dom";
import { runDropAnimation } from "../../lib/dnd/drop-animation";
import { getZoneContentIds } from "../../lib/get-zone-content-ids";
import { useAppStoreApi } from "../../store";
import type { ZoneStore } from "../DropZone/context";

/**
 * Builds the "glide" drop animation callback for components in the canvas/drawer.
 *
 * @param zoneStore - The store for the drop zone where the item is being dropped.
 * @param id - The ID of the item being dropped. Provide it if using within created components.
 * @returns A function that can be used as the drop animation callback.
 */
export const useDropAnimation = (
  zoneStore: StoreApi<ZoneStore>,
  id?: string
): DropAnimationFunction => {
  const appStore = useAppStoreApi();

  return useCallback(
    (context) => {
      const previews = Object.values(zoneStore.getState().previewIndex ?? {});
      const preview = id
        ? previews.find((entry) => entry?.props.id === id && !entry.ghost)
        : previews.find((entry) => entry?.type === "insert");

      const shouldGlide = id
        ? preview?.linePlaceholder || preview?.type === "insert"
        : !!preview;

      return runDropAnimation(
        context,
        preview && shouldGlide
          ? {
              itemId: preview.type === "move" ? id : undefined,
              targetZone: preview.zone,
              getExpectedOrder: () =>
                getZoneContentIds(appStore.getState().state, preview.zone),
            }
          : undefined
      );
    },
    [appStore, zoneStore, id]
  );
};
