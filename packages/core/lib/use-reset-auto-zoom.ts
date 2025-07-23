import { RefObject, useCallback } from "react";
import { useAppStore } from "../store";
import { getZoomConfig } from "./get-zoom-config";
import { useShallow } from "zustand/react/shallow";
import { UiState } from "../types";

type ResetAutoZoomOptions = {
  isResettingRef?: RefObject<boolean>;
  setShowTransition?: (show: boolean) => void;
  showTransition?: boolean;
  viewports?: UiState["viewports"];
};

/**
 * Hook to reset auto zoom functionality
 * This is extracted from Canvas component to be reusable across components
 */
export const useResetAutoZoom = (frameRef: RefObject<HTMLElement | null>) => {
  const { viewports, zoomConfig, setZoomConfig } = useAppStore(
    useShallow((s) => ({
      viewports: s.state.ui.viewports,
      zoomConfig: s.zoomConfig,
      setZoomConfig: s.setZoomConfig,
    }))
  );

  const resetAutoZoom = useCallback(
    (options?: ResetAutoZoomOptions) => {
      // Get viewports from options or use default
      const newViewports = options?.viewports || viewports;

      // If no resetting ref is provided, just reset the zoom
      if (!options?.isResettingRef) {
        if (frameRef.current) {
          setZoomConfig(
            getZoomConfig(
              newViewports?.current,
              frameRef.current,
              zoomConfig.zoom
            )
          );
        }
        return;
      }

      // Apply transition
      const {
        isResettingRef,
        setShowTransition,
        showTransition = false,
      } = options;

      if (!isResettingRef.current) {
        isResettingRef.current = true;

        if (setShowTransition) {
          setShowTransition(showTransition);
        }

        if (frameRef.current) {
          setZoomConfig(
            getZoomConfig(
              newViewports?.current,
              frameRef.current,
              zoomConfig.zoom
            )
          );
        }

        setTimeout(() => {
          isResettingRef.current = false;
        }, 0);
      }
    },
    [frameRef, zoomConfig, viewports, setZoomConfig]
  );

  return resetAutoZoom;
};
