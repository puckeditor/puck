import { useAppStore } from "../../../store";

export const useIsFocused = (path: string) => {
  return useAppStore((s) => s.state.ui.field.focus === path);
};
