import { useAppStore } from "../../../store";

// A field counts as focused while it or any of its subfields has focus, so an
// array or object field doesn't re-sync its whole value on every keystroke in a
// child (`items[0].title`, `link.label`).
export const isFocusedPath = (focus: string | null | undefined, path: string) =>
  focus === path ||
  !!focus?.startsWith(`${path}.`) ||
  !!focus?.startsWith(`${path}[`);

export const useIsFocused = (path: string) => {
  return useAppStore((s) => isFocusedPath(s.state.ui.field.focus, path));
};
