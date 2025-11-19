import { Config, UserGenerics, AppState, ComponentData } from "../types";
import { createContext, useContext, useEffect, useState } from "react";
import { AppStore, useAppStoreApi } from "../store";
import {
  GetPermissions,
  RefreshPermissions,
} from "../store/slices/permissions";
import { HistorySlice } from "../store/slices/history";
import { createStore, StoreApi, useStore } from "zustand";
import { makeStatePublic } from "./data/make-state-public";
import { getItem, ItemSelector } from "./data/get-item";
import { getSelectorForId } from "./get-selector-for-id";
import { PuckNodeData } from "../types/Internal";

export type UsePuckData<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
> = {
  appState: G["UserPublicAppState"];
  config: UserConfig;
  dispatch: AppStore["dispatch"];
  getPermissions: GetPermissions<UserConfig>;
  refreshPermissions: RefreshPermissions<UserConfig>;
  selectedItem: G["UserComponentData"] | null;
  getItemBySelector: (
    selector: ItemSelector
  ) => G["UserComponentData"] | undefined;
  getItemById: (id: string) => G["UserComponentData"] | undefined;
  getSelectorForId: (id: string) => Required<ItemSelector> | undefined;
  getParentById: (id: string) => ComponentData | undefined;
  history: {
    back: HistorySlice["back"];
    forward: HistorySlice["forward"];
    setHistories: HistorySlice["setHistories"];
    setHistoryIndex: HistorySlice["setHistoryIndex"];
    histories: HistorySlice["histories"];
    index: HistorySlice["index"];
    hasPast: boolean;
    hasFuture: boolean;
  };
};

export type PuckApi<UserConfig extends Config = Config> =
  UsePuckData<UserConfig>;

type UsePuckStore<UserConfig extends Config = Config> = PuckApi<UserConfig>;

type PickedStore = Pick<
  AppStore,
  "config" | "dispatch" | "selectedItem" | "permissions" | "history" | "state"
>;

export const generateUsePuck = (store: PickedStore): UsePuckStore => {
  const history: UsePuckStore["history"] = {
    back: store.history.back,
    forward: store.history.forward,
    setHistories: store.history.setHistories,
    setHistoryIndex: store.history.setHistoryIndex,
    hasPast: store.history.hasPast(),
    hasFuture: store.history.hasFuture(),
    histories: store.history.histories,
    index: store.history.index,
  };

  const storeData: PuckApi = {
    appState: makeStatePublic(store.state),
    config: store.config,
    dispatch: store.dispatch,
    getPermissions: store.permissions.getPermissions,
    refreshPermissions: store.permissions.refreshPermissions,
    history,
    selectedItem: store.selectedItem || null,
    getItemBySelector: (selector) => getItem(selector, store.state),
    getItemById: (id) => store.state.indexes.nodes[id].data,
    getSelectorForId: (id) => getSelectorForId(store.state, id),
    getParentById: (id) => {
      const node = store.state.indexes.nodes[id];
      const parentId = node.parentId;
      if (parentId === null) return;
      const parentNode = store.state.indexes.nodes[parentId];
      if (!parentNode) return;
      return parentNode.data;
    },
  };

  (storeData as any).__private = {
    appState: store.state,
  };

  return storeData;
};

export const UsePuckStoreContext = createContext<StoreApi<UsePuckStore> | null>(
  null
);

const convertToPickedStore = (store: AppStore): PickedStore => {
  return {
    state: store.state,
    config: store.config,
    dispatch: store.dispatch,
    permissions: store.permissions,
    history: store.history,
    selectedItem: store.selectedItem,
  };
};

/**
 * Mirror changes in appStore to usePuckStore
 */
export const useRegisterUsePuckStore = (
  appStore: ReturnType<typeof useAppStoreApi>
) => {
  const [usePuckStore] = useState(() =>
    createStore(() =>
      generateUsePuck(convertToPickedStore(appStore.getState()))
    )
  );

  useEffect(() => {
    // Subscribe here isn't doing anything as selection isn't shallow
    return appStore.subscribe(
      (store) => convertToPickedStore(store),
      (pickedStore) => {
        usePuckStore.setState(generateUsePuck(pickedStore));
      }
    );
  }, []);

  return usePuckStore;
};

/**
 * createUsePuck
 *
 * Create a typed usePuck hook, which is necessary because the user may provide a generic type but not
 * a selector type, and TS does not currently support partial inference.
 * Related: https://github.com/microsoft/TypeScript/issues/26242
 *
 * @returns a typed usePuck function
 */
export function createUsePuck<UserConfig extends Config = Config>() {
  return function usePuck<T = PuckApi<UserConfig>>(
    selector: (state: UsePuckStore<UserConfig>) => T
  ): T {
    const usePuckApi = useContext(UsePuckStoreContext);

    if (!usePuckApi) {
      throw new Error("usePuck must be used inside <Puck>.");
    }

    const result = useStore(
      usePuckApi as unknown as StoreApi<UsePuckStore<UserConfig>>,
      selector ?? ((s) => s as T)
    );

    return result;
  };
}

export function usePuck<UserConfig extends Config = Config>() {
  useEffect(() => {
    console.warn(
      "You're using the `usePuck` method without a selector, which may cause unnecessary re-renders. Replace with `createUsePuck` and provide a selector for improved performance."
    );
  }, []);

  return createUsePuck<UserConfig>()((s) => s);
}

/**
 * Get the latest state without relying on a render
 *
 * @returns PuckApi
 */
export function useGetPuck() {
  const usePuckApi = useContext(UsePuckStoreContext);

  if (!usePuckApi) {
    throw new Error("usePuckGet must be used inside <Puck>.");
  }

  return usePuckApi.getState;
}
