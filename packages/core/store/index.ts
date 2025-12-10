"use client";

import {
  Config,
  IframeConfig,
  Overrides,
  AppState,
  UiState,
  Plugin,
  UserGenerics,
  Field,
  ComponentConfig,
  Metadata,
  ComponentData,
  RootDataWithProps,
  ResolveDataTrigger,
  RichtextField,
} from "../types";
import { createReducer, PuckAction } from "../reducer";
import { getItem } from "../lib/data/get-item";
import { defaultViewports } from "../components/ViewportControls/default-viewports";
import { Viewports } from "../types";
import { create, StoreApi, useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createContext, useContext } from "react";
import { createHistorySlice, type HistorySlice } from "./slices/history";
import { createNodesSlice, type NodesSlice } from "./slices/nodes";
import {
  createPermissionsSlice,
  type PermissionsSlice,
} from "./slices/permissions";
import { createFieldsSlice, type FieldsSlice } from "./slices/fields";
import { resolveComponentData } from "../lib/resolve-component-data";
import { walkAppState } from "../lib/data/walk-app-state";
import { toRoot } from "../lib/data/to-root";
import { generateId } from "../lib/generate-id";
import { defaultAppState } from "./default-app-state";
import { FieldTransforms } from "../types/API/FieldTransforms";
import type { Editor } from "@tiptap/react";

export { defaultAppState };

export type Status = "LOADING" | "MOUNTED" | "READY";

type ZoomConfig = {
  autoZoom: number;
  rootHeight: number;
  zoom: number;
};

type ComponentState = Record<string, { loadingCount: number }>;

export type AppStore<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
> = {
  state: G["UserAppState"];
  dispatch: (action: PuckAction) => void;
  config: UserConfig;
  componentState: ComponentState;
  setComponentState: (componentState: ComponentState) => void;
  setComponentLoading: (
    id: string,
    loading?: boolean,
    defer?: number
  ) => () => void;
  unsetComponentLoading: (id: string) => void;
  pendingLoadTimeouts: Record<string, NodeJS.Timeout>;
  resolveComponentData: <T extends ComponentData | RootDataWithProps>(
    componentData: T,
    trigger: ResolveDataTrigger
  ) => Promise<{ node: T; didChange: boolean }>;
  resolveAndCommitData: () => void;
  plugins: Plugin[];
  overrides: Partial<Overrides>;
  viewports: Viewports;
  zoomConfig: ZoomConfig;
  setZoomConfig: (zoomConfig: ZoomConfig) => void;
  status: Status;
  setStatus: (status: Status) => void;
  iframe: IframeConfig;
  selectedItem?: G["UserData"]["content"][0] | null;
  getCurrentData: () => G["UserData"]["content"][0] | G["UserData"]["root"];
  setUi: (ui: Partial<UiState>, recordHistory?: boolean) => void;
  getComponentConfig: (type?: string) => ComponentConfig | null | undefined;
  onAction?: (action: PuckAction, newState: AppState, state: AppState) => void;
  metadata: Metadata;
  fields: FieldsSlice;
  history: HistorySlice;
  nodes: NodesSlice;
  permissions: PermissionsSlice;
  fieldTransforms: FieldTransforms;
  currentRichText?: {
    inlineComponentId?: string;
    inline: boolean;
    field: RichtextField;
    editor: Editor;
    id: string;
  } | null;
};

export type AppStoreApi = StoreApi<AppStore>;

const defaultPageFields: Record<string, Field> = {
  title: { type: "text" },
};

export const createAppStore = (initialAppStore?: Partial<AppStore>) =>
  create<AppStore>()(
    subscribeWithSelector((set, get) => ({
      state: defaultAppState,
      config: { components: {} },
      componentState: {},
      plugins: [],
      overrides: {},
      viewports: defaultViewports,
      zoomConfig: {
        autoZoom: 1,
        rootHeight: 0,
        zoom: 1,
      },
      status: "LOADING",
      iframe: {},
      metadata: {},
      fieldTransforms: {},
      ...initialAppStore,
      fields: createFieldsSlice(set, get),
      history: createHistorySlice(set, get),
      nodes: createNodesSlice(set, get),
      permissions: createPermissionsSlice(set, get),
      getCurrentData: () => {
        const s = get();

        return s.selectedItem ?? s.state.data.root;
      },
      getComponentConfig: (type?: string) => {
        const { config, selectedItem } = get();
        const rootFields = config.root?.fields || defaultPageFields;

        return type && type !== "root"
          ? config.components[type]
          : selectedItem
          ? config.components[selectedItem.type]
          : ({ ...config.root, fields: rootFields } as ComponentConfig);
      },
      selectedItem: initialAppStore?.state?.ui.itemSelector
        ? getItem(
            initialAppStore?.state?.ui.itemSelector,
            initialAppStore.state
          )
        : null,
      dispatch: (action: PuckAction) =>
        set((s) => {
          const { record } = get().history;

          const dispatch = createReducer({
            record,
            appStore: s,
          });

          const state = dispatch(s.state, action);

          const selectedItem = state.ui.itemSelector
            ? getItem(state.ui.itemSelector, state)
            : null;

          get().onAction?.(action, state, get().state);

          return { ...s, state, selectedItem };
        }),
      setZoomConfig: (zoomConfig) => set({ zoomConfig }),
      setStatus: (status) => set({ status }),
      setComponentState: (componentState) => set({ componentState }),
      pendingLoadTimeouts: {},
      setComponentLoading: (
        id: string,
        loading: boolean = true,
        defer: number = 0
      ) => {
        const { setComponentState, pendingLoadTimeouts } = get();

        const loadId = generateId();

        const setLoading = () => {
          const { componentState } = get();

          setComponentState({
            ...componentState,
            [id]: {
              ...componentState[id],
              loadingCount: (componentState[id]?.loadingCount || 0) + 1,
            },
          });
        };

        const unsetLoading = () => {
          const { componentState } = get();

          clearTimeout(timeout);

          delete pendingLoadTimeouts[loadId];

          set({ pendingLoadTimeouts });

          setComponentState({
            ...componentState,
            [id]: {
              ...componentState[id],
              loadingCount: Math.max(
                (componentState[id]?.loadingCount || 0) - 1,
                0
              ),
            },
          });
        };

        const timeout = setTimeout(() => {
          if (loading) {
            setLoading();
          } else {
            unsetLoading();
          }

          delete pendingLoadTimeouts[loadId];

          set({ pendingLoadTimeouts });
        }, defer);

        set({
          pendingLoadTimeouts: {
            ...pendingLoadTimeouts,
            [id]: timeout,
          },
        });

        return unsetLoading;
      },
      unsetComponentLoading: (id: string) => {
        const { setComponentLoading } = get();

        setComponentLoading(id, false);
      },
      // Helper
      setUi: (ui: Partial<UiState>, recordHistory?: boolean) =>
        set((s) => {
          const dispatch = createReducer({
            record: () => {},
            appStore: s,
          });

          const state = dispatch(s.state, {
            type: "setUi",
            ui,
            recordHistory,
          });

          const selectedItem = state.ui.itemSelector
            ? getItem(state.ui.itemSelector, state)
            : null;

          return { ...s, state, selectedItem };
        }),
      resolveComponentData: async (componentData, trigger) => {
        const { config, metadata, setComponentLoading, permissions } = get();

        const timeouts: Record<string, () => void> = {};

        return await resolveComponentData(
          componentData,
          config,
          metadata,
          (item) => {
            const id = "id" in item.props ? item.props.id : "root";
            timeouts[id] = setComponentLoading(id, true, 50);
          },
          async (item) => {
            const id = "id" in item.props ? item.props.id : "root";

            if ("type" in item) {
              await permissions.refreshPermissions({ item });
            } else {
              await permissions.refreshPermissions({ root: true });
            }

            timeouts[id]();
          },
          trigger
        );
      },
      resolveAndCommitData: async () => {
        const { config, state, dispatch, resolveComponentData } = get();

        walkAppState(
          state,
          config,
          (content) => content,
          (childItem) => {
            resolveComponentData(childItem, "load").then((resolved) => {
              const { state } = get();

              const node = state.indexes.nodes[resolved.node.props.id];

              // Ensure node hasn't been deleted whilst resolution happens
              if (node && resolved.didChange) {
                if (resolved.node.props.id === "root") {
                  dispatch({
                    type: "replaceRoot",
                    root: toRoot(resolved.node),
                  });
                } else {
                  // Use latest position, in case it's moved
                  const zoneCompound = `${node.parentId}:${node.zone}`;
                  const parentZone = state.indexes.zones[zoneCompound];

                  const index = parentZone.contentIds.indexOf(
                    resolved.node.props.id
                  );

                  dispatch({
                    type: "replace",
                    data: resolved.node,
                    destinationIndex: index,
                    destinationZone: zoneCompound,
                  });
                }
              }
            });

            return childItem;
          }
        );
      },
    }))
  );

export const appStoreContext = createContext(createAppStore());

export function useAppStore<T>(selector: (state: AppStore) => T) {
  const context = useContext(appStoreContext);

  return useStore(context, selector);
}

export function useAppStoreApi() {
  return useContext(appStoreContext);
}
