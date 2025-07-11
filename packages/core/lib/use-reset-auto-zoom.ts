import { RefObject, useCallback } from "react";
import { useAppStore } from "../store";
import { getZoomConfig } from "./get-zoom-config";
import { useShallow } from "zustand/react/shallow";
import { UiState } from "../types";

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
    (newViewports: UiState["viewports"] = viewports) => {
      if (frameRef.current) {
        setZoomConfig(
          getZoomConfig(
            newViewports?.current,
            frameRef.current,
            zoomConfig.zoom
          )
        );
      }
    },
    [frameRef, zoomConfig, viewports, setZoomConfig]
  );

  return resetAutoZoom;
};
