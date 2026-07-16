import { Direction } from "../../types";

export type SortPosition = "before" | "after";

/**
 * Maps a collision direction to an insert position relative to the target,
 * accounting for text direction on horizontal drags.
 */
export const getCollisionPosition = (
  direction: Direction | undefined,
  dir: "ltr" | "rtl" = "ltr"
): SortPosition =>
  direction === "up" ||
  (dir === "ltr" && direction === "left") ||
  (dir === "rtl" && direction === "right")
    ? "before"
    : "after";

/**
 * Computes the destination index for a drop relative to the target item.
 */
export const getInsertIndex = ({
  position,
  sourceIndex,
  targetIndex,
  isSameZone,
}: {
  position: SortPosition;
  sourceIndex: number;
  targetIndex: number;
  isSameZone: boolean;
}): number => {
  let index = targetIndex;

  // If the source and target are in the same zone, and the item dragged is before the target,
  // we need to adjust the index to account for the fact that the dragged item will be removed
  // from its original position before being inserted at the new position.
  if (isSameZone && index >= sourceIndex) {
    index = index - 1;
  }

  // If the drop position is "after", we always need to increment the index to insert after the target.
  if (position === "after") {
    index = index + 1;
  }

  return index;
};
