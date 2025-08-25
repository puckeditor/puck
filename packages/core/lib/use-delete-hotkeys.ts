import { useCallback } from "react";
import { useHotkey } from "./use-hotkey";
import { useAppStoreApi } from "../store";

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea") return true;
  if (target.isContentEditable) return true;

  return false;
};

export const useDeleteHotkeys = () => {
  const appStore = useAppStoreApi();

  const deleteSelectedComponent = useCallback((e?: KeyboardEvent) => {
    if (isEditableElement(document.activeElement)) {
      return false;
    }

    const { state, dispatch } = appStore.getState();
    const { itemSelector } = state.ui;

    if (!itemSelector || !itemSelector.zone) {
      return false;
    }

    dispatch({
      type: "remove",
      index: itemSelector.index,
      zone: itemSelector.zone,
    });

    return true;
  }, [appStore]);

  useHotkey({ delete: true }, deleteSelectedComponent);
  useHotkey({ backspace: true }, deleteSelectedComponent);
};
