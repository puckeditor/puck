import { useCallback } from "react";
import { useHotkey } from "./use-hotkey";
import { useAppStoreApi } from "../store";

const isElementVisible = (element: HTMLElement): boolean => {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      current.getAttribute("aria-hidden") === "true" ||
      current.hasAttribute("hidden")
    ) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
};

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

  const modal = document.querySelector(
    'dialog[open], [aria-modal="true"], [role="dialog"], [role="alertdialog"]'
  );

  if (modal && isElementVisible(modal as HTMLElement)) {
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
