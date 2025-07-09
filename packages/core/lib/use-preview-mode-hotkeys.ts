import { useCallback } from "react";
import { useHotkey } from "./use-hotkey";
import { useAppStoreApi } from "../store";

export const usePreviewModeHotkeys = () => {
  const appStore = useAppStoreApi();
  const toggleInteractive = useCallback(() => {
    const dispatch = appStore.getState().dispatch;

    dispatch({
      type: "setUi",
      ui: (ui) => ({
        previewMode: ui.previewMode === "edit" ? "interactive" : "edit",
      }),
    });
  }, [appStore]);

  useHotkey({ meta: true, i: true }, toggleInteractive);
  useHotkey({ ctrl: true, i: true }, toggleInteractive); // Windows
};
