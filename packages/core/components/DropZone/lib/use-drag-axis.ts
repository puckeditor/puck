import { RefObject, useCallback, useEffect, useState } from "react";
import { DragAxis } from "../../../types";
import { useAppStore } from "../../../store";

const GRID_DRAG_AXIS: DragAxis = "dynamic";
const FLEX_ROW_DRAG_AXIS: DragAxis = "x";
const DEFAULT_DRAG_AXIS: DragAxis = "y";

export const useDragAxis = (
  ref: RefObject<HTMLElement | null>,
  collisionAxis?: DragAxis
): [DragAxis, () => void] => {
  const status = useAppStore((s) => s.status);

  const [dragAxis, setDragAxis] = useState<DragAxis>(
    collisionAxis || DEFAULT_DRAG_AXIS
  );

  const calculateDragAxis = useCallback(() => {
    if (ref.current) {
      const computedStyle = window.getComputedStyle(ref.current);

      if (computedStyle.display === "grid") {
        setDragAxis(GRID_DRAG_AXIS);
      } else if (
        computedStyle.display === "flex" &&
        computedStyle.flexDirection === "row"
      ) {
        setDragAxis(FLEX_ROW_DRAG_AXIS);
      } else {
        setDragAxis(DEFAULT_DRAG_AXIS);
      }
    }
  }, [ref.current]);

  useEffect(() => {
    const onViewportChange = () => {
      calculateDragAxis();
    };

    window.addEventListener("viewportchange", onViewportChange);

    return () => {
      window.removeEventListener("viewportchange", onViewportChange);
    };
  }, []);

  useEffect(calculateDragAxis, [status, collisionAxis]);

  return [dragAxis, calculateDragAxis];
};
