import { createStore } from "zustand/vanilla";
import { Direction } from "../../../../types";

export const collisionStore = createStore<{
  fallbackEnabled: boolean;
}>(() => ({
  fallbackEnabled: false,
}));
