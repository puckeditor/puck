import type { DndBehavior } from "../../types";

export type DndMode = Exclude<DndBehavior, "auto">;

type ResolveDndModeOptions = {
  /** Whether the user is dragging a component between slots */
  isDraggingBetweenSlots?: boolean;
  /** Whether the user is dragging a new component from the component drawer */
  isNewComponent?: boolean;
  /** Whether the user is dragging a component from its drag handle */
  isDraggingFromHandle?: boolean;
};

/**
 * Returns the DndMode (`static` or `fluid`) based on the provided behavior and options.
 *
 * Every place that needs to know the DndMode should use this function instead of implementing its own logic.
 *
 * @param behavior The behavior provided by the user
 * @returns The DndMode (`static` or `fluid`).
 */
export const resolveDndMode = (
  behavior: DndBehavior,
  {
    isDraggingBetweenSlots = false,
    isNewComponent = false,
    isDraggingFromHandle = false,
  }: ResolveDndModeOptions = {}
): DndMode => {
  if (behavior === "auto") {
    return isDraggingBetweenSlots || isNewComponent || isDraggingFromHandle
      ? "static"
      : "fluid";
  }

  return behavior;
};
