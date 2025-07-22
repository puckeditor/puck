import {
  PropsWithChildren,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Draggable } from "@dnd-kit/dom";
import { useAppStore } from "../../store";
import { createStore, StoreApi } from "zustand";

export type PathData = Record<string, { path: string[]; label: string }>;

export type DropZoneContext = {
  areaId?: string;
  zoneCompound?: string;
  index?: number;
  registerZone?: (zoneCompound: string) => void;
  unregisterZone?: (zoneCompound: string) => void;
  mode?: "edit" | "render";
  depth: number;
  registerLocalZone?: (zone: string, active: boolean) => void; // A zone as it pertains to the current area
  unregisterLocalZone?: (zone: string) => void;
} | null;

export const dropZoneContext = createContext<DropZoneContext>(null);

export type Preview = {
  componentType: string;
  index: number;
  zone: string;
  props: Record<string, any>;
  type: "insert" | "move";
  element: Element | undefined;
} | null;

export type ZoneStore = {
  zoneDepthIndex: Record<string, boolean>;
  areaDepthIndex: Record<string, boolean>;
  nextZoneDepthIndex: Record<string, boolean>;
  nextAreaDepthIndex: Record<string, boolean>;
  enabledIndex: Record<string, boolean>;
  previewIndex: Record<string, Preview>;
  draggedItem?: Draggable | null;
  hoveringComponent: string | null;
};

export const ZoneStoreContext = createContext<StoreApi<ZoneStore>>(
  createStore(() => ({
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

export const ZoneStoreProvider = ({
  children,
  store,
}: PropsWithChildren<{ store: StoreApi<ZoneStore> }>) => {
  return (
    <ZoneStoreContext.Provider value={store}>
      {children}
    </ZoneStoreContext.Provider>
  );
};

export const DropZoneProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: DropZoneContext;
}) => {
  const dispatch = useAppStore((s) => s.dispatch);

  const registerZone = useCallback(
    (zoneCompound: string) => {
      dispatch({
        type: "registerZone",
        zone: zoneCompound,
      });
    },
    [dispatch]
  );

  const memoValue = useMemo(
    () =>
      ({
        registerZone,
        ...value,
      } as DropZoneContext),
    [value]
  );

  return (
    <>
      {memoValue && (
        <dropZoneContext.Provider value={memoValue}>
          {children}
        </dropZoneContext.Provider>
      )}
    </>
  );
};
