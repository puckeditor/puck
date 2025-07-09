import { Preview } from "./../context";
import { useContext, useEffect, useState } from "react";
import { useRenderedCallback } from "../../../lib/dnd/use-rendered-callback";
import { insert } from "../../../lib/data/insert";
import { ZoneStoreContext } from "../context";
import { useContextStore } from "../../../lib/use-context-store";
import { useAppStore } from "../../../store";

export const useContentIdsWithPreview = (
  contentIds: string[],
  zoneCompound: string
): [string[], Preview | undefined] => {
  const zoneStore = useContext(ZoneStoreContext);
  const preview = useContextStore(
    ZoneStoreContext,
    (s) => s.previewIndex[zoneCompound]
  );

  const isDragging = useAppStore((s) => s.state.ui.isDragging);

  const [contentIdsWithPreview, setContentIdsWithPreview] =
    useState(contentIds);
  const [localPreview, setLocalPreview] = useState<Preview | undefined>(
    preview
  );

  const updateContent = useRenderedCallback(
    (
      contentIds: string[],
      preview: Preview | undefined,
      isDragging: boolean,
      draggedItemId?: string,
      previewExists?: boolean
    ) => {
      // Preview is cleared but context hasn't yet caught up
      // This is necessary because Zustand clears the preview before the dispatcher finishes
      if (isDragging && !previewExists) {
        return;
      }

      if (preview) {
        if (preview.type === "insert") {
          setContentIdsWithPreview(
            insert(
              contentIds.filter((id) => id !== preview.props.id),
              preview.index,
              preview.props.id
            )
          );
        } else {
          setContentIdsWithPreview(
            insert(
              contentIds.filter((id) => id !== preview.props.id),
              preview.index,
              preview.props.id
            )
          );
        }
      } else {
        setContentIdsWithPreview(
          previewExists
            ? contentIds.filter((id) => id !== draggedItemId)
            : contentIds
        );
      }

      setLocalPreview(preview);
    },
    []
  );

  useEffect(() => {
    // We MUST explicitly pass these in, otherwise mobile dragging fails
    // due to hard-to-debug rendering race conditions. This must happen
    // within this callback (after preview has updated), and not inside
    // the renderedCallback.
    const s = zoneStore.getState();
    const draggedItemId = s.draggedItem?.id;
    const previewExists = Object.keys(s.previewIndex || {}).length > 0;

    updateContent(
      contentIds,
      preview,
      isDragging,
      draggedItemId,
      previewExists
    );
  }, [contentIds, preview, isDragging]);

  return [contentIdsWithPreview, localPreview];
};
