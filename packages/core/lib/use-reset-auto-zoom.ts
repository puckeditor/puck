import { RefObject } from "react";
import { useAppStoreApi } from "../store";
import { getZoomConfig } from "./get-zoom-config";
import { UiState } from "../types";

type ResetAutoZoomOptions = {
  viewports?: UiState["viewports"];
};

/**
 * Hook to reset auto zoom functionality
 * This is extracted from Canvas component to be reusable across components
 */
export const useResetAutoZoom = (frameRef: RefObject<HTMLElement | null>) => {
  const appStoreApi = useAppStoreApi();

  const resetAutoZoom = (options?: ResetAutoZoomOptions) => {
    const { state, zoomConfig, setZoomConfig } = appStoreApi.getState();
    const { viewports } = state.ui;
    const newViewports = options?.viewports || viewports;

    if (frameRef.current) {
      setZoomConfig(
        getZoomConfig(newViewports?.current, frameRef.current, zoomConfig.zoom)
      );
    }
  };

  return resetAutoZoom;
};
