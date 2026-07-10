import type { DndBehavior } from "../../types";

export type DndMode = Exclude<DndBehavior, "auto">;

type ResolveDndModeOptions = {
  isDraggingBetweenSlots?: boolean;
  isNewComponent?: boolean;
};

export const resolveDndMode = (
  behavior: DndBehavior,
  {
    isDraggingBetweenSlots = false,
    isNewComponent = false,
  }: ResolveDndModeOptions = {}
): DndMode => {
  if (behavior === "auto") {
    return isDraggingBetweenSlots || isNewComponent ? "static" : "fluid";
  }

  return behavior;
};

export const resolveOriginPreviewIndex = (
  initialIndex: number,
  preview?: { index: number; linePlaceholder?: boolean } | null
) => {
  if (!preview || preview.linePlaceholder) {
    return initialIndex;
  }

  return preview.index;
};
