import { useCallback } from "react";
import { useHotkey } from "./use-hotkey";
import { useAppStoreApi } from "../store";

const shouldBlockDeleteHotkey = (e?: KeyboardEvent): boolean => {
  if (e?.defaultPrevented) return true;

  const origin =
    (e?.composedPath?.()[0] as Element | undefined) ||
    (e?.target as Element | undefined) ||
    (document.activeElement as Element | null);

  if (origin instanceof HTMLElement) {
    const tag = origin.tagName.toLowerCase();

    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (origin.isContentEditable) return true;

    const role = origin.getAttribute("role");
    if (
      role === "textbox" ||
      role === "combobox" ||
      role === "searchbox" ||
      role === "listbox" ||
      role === "grid"
    ) {
      return true;
    }
  }

  if (
    document.querySelector(
      'dialog[open], [aria-modal="true"], [role="dialog"]:not([aria-hidden="true"])'
    )
  ) {
    return true;
  }

  return false;
};

export const useDeleteHotkeys = () => {
  const appStore = useAppStoreApi();

  const deleteSelectedComponent = useCallback(
    (e?: KeyboardEvent) => {
      if (shouldBlockDeleteHotkey(e)) {
        return false;
      }

      const { state, dispatch, permissions, selectedItem } =
        appStore.getState();
      const sel = state.ui?.itemSelector;

      // Swallow key in canvas context to avoid browser back navigation.
      if (!sel?.zone || !selectedItem) return true;

      if (!permissions.getPermissions({ item: selectedItem }).delete)
        return true;

      dispatch({
        type: "remove",
        index: sel.index,
        zone: sel.zone,
      });
      return true;
    },
    [appStore]
  );

  useHotkey({ delete: true }, deleteSelectedComponent);
  useHotkey({ backspace: true }, deleteSelectedComponent);
};
