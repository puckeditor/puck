import { ReactNode, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import { createContextStore } from "../../lib/use-context-store";
import { ExtractState, StoreApi, useStore } from "zustand";

type FieldStore = Record<string, any>;

export const fieldContextStore = createContextStore<FieldStore>({});

export const useFieldStoreApi = () => useContext(fieldContextStore.ctx);

export function useFieldStore<U>(
  selector: (s: ExtractState<StoreApi<FieldStore>>) => U
): U {
  const store = useContext(fieldContextStore.ctx);

  if (!store) {
    throw new Error("useContextStore must be used inside context");
  }

  return useStore<typeof store, U>(store, useShallow(selector));
}
