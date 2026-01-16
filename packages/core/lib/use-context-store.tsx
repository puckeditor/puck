import { Context, createContext, ReactNode, useContext, useState } from "react";
import { createStore, StoreApi, useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type ExtractState<S> = S extends {
  getState: () => infer T;
}
  ? T
  : never;

/**
 * Use a Zustand store via context
 */
export function useContextStore<T, U>(
  context: Context<StoreApi<T>>,
  selector: (s: ExtractState<StoreApi<T>>) => U
): U {
  const store = useContext(context);

  if (!store) {
    throw new Error("useContextStore must be used inside context");
  }

  return useStore<StoreApi<T>, U>(store, useShallow(selector));
}

export function createStoreProvider<ValueType>(
  ContextComponent: Context<StoreApi<ValueType>>
) {
  const StoreProvider = ({
    children,
    value,
  }: {
    children: ReactNode;
    value: ValueType;
  }) => {
    const [store] = useState(() => createStore<ValueType>(() => value));

    return (
      <ContextComponent.Provider value={store}>
        {children}
      </ContextComponent.Provider>
    );
  };

  return StoreProvider;
}

export function createContextStore<ValueType>(defaultValue: ValueType) {
  const ctx = createContext<StoreApi<ValueType>>(
    createStore(subscribeWithSelector(() => defaultValue))
  );

  return {
    ctx,
    Provider: createStoreProvider(ctx),
  };
}
