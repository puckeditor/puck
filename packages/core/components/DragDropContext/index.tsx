import { DragDropProvider } from "@dnd-kit/react";
import { useAppStore, useAppStoreApi } from "../../store";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutoScroller, defaultPreset, DragDropManager } from "@dnd-kit/dom";
import { DragDropEvents } from "@dnd-kit/abstract";
import { DropZoneProvider } from "../DropZone";
import type { Draggable, Droppable } from "@dnd-kit/dom";
import { getItem } from "../../lib/data/get-item";
import {
  DropZoneContext,
  Preview,
  ZoneStore,
  ZoneStoreProvider,
} from "../DropZone/context";
import { createNestedDroppablePlugin } from "../../lib/dnd/NestedDroppablePlugin";
import { insertComponent } from "../../lib/insert-component";
import { useDebouncedCallback } from "use-debounce";
import { ComponentDndData } from "../DraggableComponent";

import { collisionStore } from "../../lib/dnd/collision/dynamic/store";
import { generateId } from "../../lib/generate-id";
import { createStore } from "zustand";
import { getDeepDir } from "../../lib/get-deep-dir";
import { useSensors } from "../../lib/dnd/use-sensors";
import { useSafeId } from "../../lib/use-safe-id";
import { getFrame } from "../../lib/get-frame";
import { effect } from "@dnd-kit/state";

const DEBUG = false;

type Events = DragDropEvents<Draggable, Droppable, DragDropManager>;
type DragCbs = Partial<{ [eventName in keyof Events]: Events[eventName][] }>;

const dragListenerContext = createContext<{
  dragListeners: DragCbs;
  setDragListeners?: Dispatch<SetStateAction<DragCbs>>;
}>({
  dragListeners: {},
});

type EventKeys = keyof Events;

export function useDragListener(
  type: EventKeys,
  fn: Events[EventKeys],
  deps: any[] = []
) {
  const { setDragListeners } = useContext(dragListenerContext);

  useEffect(() => {
    if (setDragListeners) {
      setDragListeners((old) => ({
        ...old,
        [type]: [...(old[type] || []), fn],
      }));
    }
  }, deps);
}

type DeepestParams = {
  zone: string | null;
  area: string | null;
};

const AREA_CHANGE_DEBOUNCE_MS = 100;

type DragDropContextProps = {
  children: ReactNode;
  disableAutoScroll?: boolean;
};

/**
 * Temporarily disable fallback collisions types, which
 * can cause issues during a zone switch.
 *
 * @param timeout the time in ms to disable the fallback collision for
 * @returns a function that temporarily disables the collision
 */
const useTempDisableFallback = (timeout: number) => {
  const lastFallbackDisable = useRef<string>(null);

  return useCallback((manager: DragDropManager) => {
    collisionStore.setState({ fallbackEnabled: false });

    // Track an ID in case called more than once, so only last call re-enables
    const fallbackId = generateId();
    lastFallbackDisable.current = fallbackId;

    setTimeout(() => {
      if (lastFallbackDisable.current === fallbackId) {
        collisionStore.setState({ fallbackEnabled: true });
        manager.collisionObserver.forceUpdate(true);
      }
    }, timeout);
  }, []);
};

const DragDropContextClient = ({
  children,
  disableAutoScroll,
}: DragDropContextProps) => {
  const dispatch = useAppStore((s) => s.dispatch);
  const appStore = useAppStoreApi();

  const id = useSafeId();

  const debouncedParamsRef = useRef<DeepestParams | null>(null);

  const tempDisableFallback = useTempDisableFallback(100);

  const [zoneStore] = useState(() =>
    createStore<ZoneStore>(() => ({
      zoneDepthIndex: {},
      nextZoneDepthIndex: {},
      areaDepthIndex: {},
      nextAreaDepthIndex: {},
      draggedItem: null,
      previewIndex: {},
      enabledIndex: {},
      hoveringComponent: null,
    }))
  );

  const getChanged = useCallback(
    (params: DeepestParams, id: string) => {
      const { zoneDepthIndex = {}, areaDepthIndex = {} } =
        zoneStore.getState() || {};

      const stateHasZone = Object.keys(zoneDepthIndex).length > 0;
      const stateHasArea = Object.keys(areaDepthIndex).length > 0;

      let zoneChanged = false;
      let areaChanged = false;

      if (params.zone && !zoneDepthIndex[params.zone]) {
        zoneChanged = true;
      } else if (!params.zone && stateHasZone) {
        zoneChanged = true;
      }

      if (params.area && !areaDepthIndex[params.area]) {
        areaChanged = true;
      } else if (!params.area && stateHasArea) {
        areaChanged = true;
      }

      return { zoneChanged, areaChanged };
    },
    [zoneStore]
  );

  const setDeepestAndCollide = useCallback(
    (params: DeepestParams, manager: DragDropManager) => {
      const { zoneChanged, areaChanged } = getChanged(params, id);

      if (!zoneChanged && !areaChanged) return;

      zoneStore.setState({
        zoneDepthIndex: params.zone ? { [params.zone]: true } : {},
        areaDepthIndex: params.area ? { [params.area]: true } : {},
      });

      // Disable fallback collisions temporarily after zone change,
      // as these can cause unexpected collisions
      tempDisableFallback(manager);

      setTimeout(() => {
        // Force update after debounce
        manager.collisionObserver.forceUpdate(true);
      }, 50);

      debouncedParamsRef.current = null;
    },
    [zoneStore]
  );

  const setDeepestDb = useDebouncedCallback(
    setDeepestAndCollide,
    AREA_CHANGE_DEBOUNCE_MS
  );

  const cancelDb = () => {
    setDeepestDb.cancel();
    debouncedParamsRef.current = null;
  };

  useEffect(() => {
    if (DEBUG) {
      zoneStore.subscribe((s) =>
        console.log(
          s.previewIndex,
          Object.entries(s.zoneDepthIndex || {})[0]?.[0],
          Object.entries(s.areaDepthIndex || {})[0]?.[0]
        )
      );
    }
  }, []);

  const [plugins] = useState(() => [
    ...(disableAutoScroll
      ? defaultPreset.plugins.filter((plugin) => plugin !== AutoScroller)
      : defaultPreset.plugins),
    createNestedDroppablePlugin(
      {
        onChange: (params, manager) => {
          const state = zoneStore.getState();

          const { zoneChanged, areaChanged } = getChanged(params, id);

          const isDragging = manager.dragOperation.status.dragging;

          if (areaChanged || zoneChanged) {
            let nextZoneDepthIndex: Record<string, boolean> = {};
            let nextAreaDepthIndex: Record<string, boolean> = {};

            if (params.zone) {
              nextZoneDepthIndex = { [params.zone]: true };
            }

            if (params.area) {
              nextAreaDepthIndex = { [params.area]: true };
            }

            zoneStore.setState({ nextZoneDepthIndex, nextAreaDepthIndex });
          }

          if (params.zone !== "void" && state?.zoneDepthIndex["void"]) {
            setDeepestAndCollide(params, manager);
            return;
          }

          if (areaChanged) {
            if (isDragging) {
              // Only call the debounced function if these params differ from the last pending call
              const debouncedParams = debouncedParamsRef.current;
              const isSameParams =
                debouncedParams &&
                debouncedParams.area === params.area &&
                debouncedParams.zone === params.zone;

              if (!isSameParams) {
                cancelDb(); // NB we always cancel the debounce if the params change, so we could just use a timer
                setDeepestDb(params, manager);
                debouncedParamsRef.current = params;
              }
            } else {
              cancelDb();
              setDeepestAndCollide(params, manager);
            }

            return;
          }

          if (zoneChanged) {
            setDeepestAndCollide(params, manager);
          }

          cancelDb();
        },
      },
      id
    ),
  ]);

  const sensors = useSensors();

  const [dragListeners, setDragListeners] = useState<DragCbs>({});

  const dragMode = useRef<"new" | "existing" | null>(null);

  const initialSelector = useRef<{ zone: string; index: number }>(undefined);

  const nextContextValue = useMemo<DropZoneContext>(
    () => ({
      mode: "edit",
      areaId: "root",
      depth: 0,
    }),
    []
  );

  return (
    <div id={id}>
      <dragListenerContext.Provider
        value={{
          dragListeners,
          setDragListeners,
        }}
      >
        <DragDropProvider
          plugins={plugins}
          sensors={sensors}
          onDragEnd={(event, manager) => {
            const entryEl = getFrame()?.querySelector("[data-puck-entry]");
            entryEl?.removeAttribute("data-puck-dragging");

            const { source, target } = event.operation;

            if (!source) {
              zoneStore.setState({ draggedItem: null });

              return;
            }

            const { zone, index } = source.data as ComponentDndData;

            const { previewIndex = {} } = zoneStore.getState() || {};

            const thisPreview: Preview | null =
              previewIndex[zone]?.props.id === source.id
                ? previewIndex[zone]
                : null;

            const onAnimationEnd = () => {
              zoneStore.setState({ draggedItem: null });

              // Tidy up cancellation
              if (event.canceled || target?.type === "void") {
                zoneStore.setState({ previewIndex: {} });

                dragListeners.dragend?.forEach((fn) => {
                  fn(event, manager);
                });

                dispatch({
                  type: "setUi",
                  ui: {
                    itemSelector: null,
                    isDragging: false,
                  },
                });

                return;
              }

              // Finalise the drag
              if (thisPreview) {
                zoneStore.setState({ previewIndex: {} });

                if (thisPreview.type === "insert") {
                  insertComponent(
                    thisPreview.componentType,
                    thisPreview.zone,
                    thisPreview.index,
                    appStore
                  );
                } else if (initialSelector.current) {
                  dispatch({
                    type: "move",
                    sourceIndex: initialSelector.current.index,
                    sourceZone: initialSelector.current.zone,
                    destinationIndex: thisPreview.index,
                    destinationZone: thisPreview.zone,
                    recordHistory: false,
                  });
                }
              }

              dispatch({
                type: "setUi",
                ui: {
                  itemSelector: { index, zone },
                  isDragging: false,
                },
                recordHistory: true,
              });

              dragListeners.dragend?.forEach((fn) => {
                fn(event, manager);
              });
            };

            // Delay insert until animation has finished
            let dispose: () => void | undefined;

            dispose = effect(() => {
              if (source.status === "idle") {
                onAnimationEnd();
                dispose?.();
              }
            });
          }}
          onDragOver={(event, manager) => {
            // Prevent the optimistic re-ordering
            event.preventDefault();

            const draggedItem = zoneStore.getState()?.draggedItem;

            // Drag end can sometimes trigger after drag
            if (!draggedItem) return;

            // Cancel any stale debounces
            cancelDb();

            const { source, target } = event.operation;

            if (!target || !source || target.type === "void") return;

            const [sourceId] = (source.id as string).split(":");
            const [targetId] = (target.id as string).split(":");

            const sourceData = source.data as ComponentDndData;

            let sourceZone = sourceData.zone;
            let sourceIndex = sourceData.index;

            let targetZone = "";
            let targetIndex = 0;

            if (target.type === "component") {
              const targetData = target.data as ComponentDndData;

              targetZone = targetData.zone;
              targetIndex = targetData.index;

              const collisionData =
                manager.collisionObserver.collisions[0]?.data;

              const dir = getDeepDir(target.element);

              const collisionPosition =
                collisionData?.direction === "up" ||
                (dir === "ltr" && collisionData?.direction === "left") ||
                (dir === "rtl" && collisionData?.direction === "right")
                  ? "before"
                  : "after";

              if (targetIndex >= sourceIndex && sourceZone === targetZone) {
                targetIndex = targetIndex - 1;
              }

              if (collisionPosition === "after") {
                targetIndex = targetIndex + 1;
              }
            } else {
              targetZone = target.id.toString();
              targetIndex = 0;
            }

            const path =
              appStore.getState().state.indexes.nodes[target.id]?.path || [];

            // Abort if dragging over self or descendant
            if (
              targetId === sourceId ||
              path.find((path) => {
                const [pathId] = (path as string).split(":");
                return pathId === sourceId;
              })
            ) {
              return;
            }

            if (dragMode.current === "new") {
              zoneStore.setState({
                previewIndex: {
                  [targetZone]: {
                    componentType: sourceData.componentType,
                    type: "insert",
                    index: targetIndex,
                    zone: targetZone,
                    element: source.element,
                    props: {
                      id: source.id.toString(),
                    },
                  },
                },
              });
            } else {
              if (!initialSelector.current) {
                initialSelector.current = {
                  zone: sourceData.zone,
                  index: sourceData.index,
                };
              }

              const item = getItem(
                initialSelector.current,
                appStore.getState().state
              );

              if (item) {
                zoneStore.setState({
                  previewIndex: {
                    [targetZone]: {
                      componentType: sourceData.componentType,
                      type: "move",
                      index: targetIndex,
                      zone: targetZone,
                      props: item.props,
                      element: source.element,
                    },
                  },
                });
              }
            }

            dragListeners.dragover?.forEach((fn) => {
              fn(event, manager);
            });
          }}
          onDragStart={(event, manager) => {
            const { source } = event.operation;

            if (source && source.type !== "void") {
              const sourceData = source.data as ComponentDndData;

              const item = getItem(
                {
                  zone: sourceData.zone,
                  index: sourceData.index,
                },
                appStore.getState().state
              );

              if (item) {
                zoneStore.setState({
                  previewIndex: {
                    [sourceData.zone]: {
                      componentType: sourceData.componentType,
                      type: "move",
                      index: sourceData.index,
                      zone: sourceData.zone,
                      props: item.props,
                      element: source.element,
                    },
                  },
                });
              }
            }

            dragListeners.dragstart?.forEach((fn) => {
              fn(event, manager);
            });
          }}
          onBeforeDragStart={(event) => {
            const isNewComponent = event.operation.source?.type === "drawer";

            dragMode.current = isNewComponent ? "new" : "existing";
            initialSelector.current = undefined;

            zoneStore.setState({ draggedItem: event.operation.source });

            if (
              appStore.getState().selectedItem?.props.id !==
              event.operation.source?.id
            ) {
              dispatch({
                type: "setUi",
                ui: {
                  itemSelector: null,
                  isDragging: true,
                },
                recordHistory: false,
              });
            } else {
              dispatch({
                type: "setUi",
                ui: {
                  isDragging: true,
                },
                recordHistory: false,
              });
            }

            const entryEl = getFrame()?.querySelector("[data-puck-entry]");
            entryEl?.setAttribute("data-puck-dragging", "true");
          }}
        >
          <ZoneStoreProvider store={zoneStore}>
            <DropZoneProvider value={nextContextValue}>
              {children}
            </DropZoneProvider>
          </ZoneStoreProvider>
        </DragDropProvider>
      </dragListenerContext.Provider>
    </div>
  );
};

export const DragDropContext = ({
  children,
  disableAutoScroll,
}: DragDropContextProps) => {
  const status = useAppStore((s) => s.status);

  if (status === "LOADING") {
    return children;
  }

  return (
    <DragDropContextClient disableAutoScroll={disableAutoScroll}>
      {children}
    </DragDropContextClient>
  );
};
