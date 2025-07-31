import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { PuckAction } from "../reducer";

/**
 * Custom hook for managing sidebar resize functionality
 * @param position The position of the sidebar ("left" or "right")
 * @param dispatch The dispatch function from the app store
 * @returns Object containing width, setWidth, sidebarRef, and handleResizeEnd
 */
export function useSidebarResize(
  position: "left" | "right",
  dispatch: (action: PuckAction) => void
) {
  const [width, setWidth] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const storeWidth = useAppStore((s) =>
    position === "left"
      ? s.state.ui.leftSideBarWidth
      : s.state.ui.rightSideBarWidth
  );

  // Load saved widths from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !storeWidth) {
      try {
        const savedWidths = localStorage.getItem("puck-sidebar-widths");
        if (savedWidths) {
          const widths = JSON.parse(savedWidths);
          const savedWidth = widths[position];
          const key =
            position === "left" ? "leftSideBarWidth" : "rightSideBarWidth";

          if (savedWidth) {
            dispatch({
              type: "setUi",
              ui: {
                [key]: savedWidth,
              },
            });
          }
        }
      } catch (error) {
        console.error(
          `Failed to load ${position} sidebar width from localStorage`,
          error
        );
      }
    }
  }, [dispatch, position, storeWidth]);

  useEffect(() => {
    if (storeWidth !== undefined) {
      setWidth(storeWidth);
    }
  }, [storeWidth]);

  const handleResizeEnd = useCallback(
    (width: number) => {
      // Update store
      dispatch({
        type: "setUi",
        ui: {
          [position === "left" ? "leftSideBarWidth" : "rightSideBarWidth"]:
            width,
        },
      });

      // Save to localStorage
      let widths = {};
      try {
        const savedWidths = localStorage.getItem("puck-sidebar-widths");
        widths = savedWidths ? JSON.parse(savedWidths) : {};
      } catch (error) {
        console.error(
          `Failed to save ${position} sidebar width to localStorage`,
          error
        );
      } finally {
        localStorage.setItem(
          "puck-sidebar-widths",
          JSON.stringify({
            ...widths,
            [position]: width,
          })
        );
      }

      // Trigger auto zoom
      window.dispatchEvent(
        new CustomEvent("viewportchange", {
          bubbles: true,
          cancelable: false,
        })
      );
    },
    [dispatch, position]
  );

  return {
    width,
    setWidth,
    sidebarRef,
    handleResizeEnd,
  };
}
