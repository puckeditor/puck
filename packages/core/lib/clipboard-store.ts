import { create } from "zustand";
import { ComponentData } from "../types";

export interface ClipboardData {
  component: ComponentData | null;
  copiedAt: number;
}

interface ClipboardStore {
  clipboardData: ClipboardData;
  copy: (component: ComponentData) => void;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  clipboardData: {
    component: null,
    copiedAt: 0,
  },
  copy: (component: ComponentData) => {
    set({
      clipboardData: {
        component,
        copiedAt: Date.now(),
      },
    });
  },
  clear: () => {
    set({
      clipboardData: {
        component: null,
        copiedAt: 0,
      },
    });
  },
}));
