import { createContext, PropsWithChildren, useContext } from "react";
import { createStore, StoreApi } from "zustand";

import { useContextStore } from "../../../lib/use-context-store";

/** Delay until hovered rows expand */
export const OUTLINE_EXPAND_DELAY_MS = 600;

/** Outline drop target item selector */
export type OutlineDrop = { zone: string; index: number };

/** Outline component being dragged */
export type OutlineDraggedRow = {
  /** The component id of the item being dragged (as defined by Puck) */
  itemId: string;
  /** The zone compound containing the item */
  zoneCompound: string;
  /** The index of the item within its zone */
  index: number;
  /** The type of the component being dragged */
  componentType: string;
};

/** The outline indicator location that should be shown on top of the target */
export type OutlineIndicator = {
  /** The component id of the outline item that should display the indicator */
  targetId: string;
  /** The position of the indicator relative to the target item */
  position: "before" | "after" | "inside";
};

export type OutlineDndStore = {
  /**
   * The current status of the outline drag-and-drop operation
   *
   * - "dragging" means a component is being dragged
   * - "dropping" means the drag has ended but the drop animation is still in progress
   * - "idle" means no drag operation is active.
   *
   * NB: The "dropping" state is used to suppress the post-drop click event that would re-select the source row's old position,
   * by keeping the store in a transitional state until the source settles.
   */
  status: "idle" | "dragging" | "dropping";
  /** The component currently being dragged, or null if no drag is active */
  draggedRow: OutlineDraggedRow | null;
  /** Ids of collapsed items temporarily expanded by hovering during the current drag */
  tempExpandedIds: ReadonlySet<string>;
  /** Row highlighted while its expand timer is pending */
  expandCandidateId: string | null;
  /** The position of the current drop indicator relative to the target item */
  indicator: OutlineIndicator | null;
  /** The item selector of the current drop target */
  drop: OutlineDrop | null;
  /**
   * Per-drag memo for accept/constraint checks. Mutated in place — accept
   * callbacks run on every collision pass and must not notify subscribers.
   */
  acceptCache: Map<string, boolean>;
  /** Starts a drag operation with the given row as the dragged item, sets the status as "dragging" */
  startDrag: (row: OutlineDraggedRow) => void;
  /** Sets the current drop target indicator and associated drop item selector */
  setTarget: (indicator: OutlineIndicator, drop: OutlineDrop) => void;
  /** Clears the current drop target indicator and associated drop item selector */
  clearTarget: () => void;
  /** Highlights the row immediately; expands it after the delay */
  scheduleExpand: (rowId: string, onExpand: () => void) => void;
  /** Cancels any pending row expansion */
  cancelPendingExpand: () => void;
  /** Clears targeting state, sets the status as "dropping", and keeps the rest of the current drag */
  endDrag: () => void;
  /** Resets the store to its initial state, sets the status as "idle", should be called after a drag operation is complete */
  reset: () => void;
};

/** Creates the outline drag-and-drop store */
export const createOutlineDndStore = () => {
  // Timer for the row expand delay. Cleared on drag end or when a different row is hovered.
  let expandTimer: ReturnType<typeof setTimeout> | null = null;
  // Id of the row currently scheduled for expansion. Cleared on drag end or when a different row is hovered.
  let pendingRowId: string | null = null;

  const cancelTimer = () => {
    if (expandTimer !== null) {
      clearTimeout(expandTimer);
      expandTimer = null;
    }

    pendingRowId = null;
  };

  return createStore<OutlineDndStore>((set, get) => ({
    status: "idle",
    draggedRow: null,
    tempExpandedIds: new Set(),
    expandCandidateId: null,
    indicator: null,
    drop: null,
    acceptCache: new Map(),
    startDrag: (draggedRow) =>
      set({
        status: "dragging",
        draggedRow,
        acceptCache: new Map(),
      }),
    setTarget: (indicator, drop) => {
      const current = get();

      if (
        current.indicator?.targetId === indicator.targetId &&
        current.indicator?.position === indicator.position &&
        current.drop?.zone === drop.zone &&
        current.drop?.index === drop.index
      ) {
        return;
      }

      set({ indicator, drop });
    },
    clearTarget: () => {
      if (get().indicator === null && get().drop === null) {
        return;
      }

      set({ indicator: null, drop: null });
    },
    scheduleExpand: (rowId, onExpand) => {
      if (pendingRowId === rowId || get().tempExpandedIds.has(rowId)) {
        return;
      }

      cancelTimer();
      pendingRowId = rowId;

      set({ expandCandidateId: rowId });

      expandTimer = setTimeout(() => {
        expandTimer = null;
        pendingRowId = null;

        set((s) => ({
          tempExpandedIds: new Set(s.tempExpandedIds).add(rowId),
          expandCandidateId: null,
        }));

        onExpand();
      }, OUTLINE_EXPAND_DELAY_MS);
    },
    cancelPendingExpand: () => {
      cancelTimer();

      if (get().expandCandidateId !== null) {
        set({ expandCandidateId: null });
      }
    },
    endDrag: () => {
      cancelTimer();

      set({
        status: "dropping",
        indicator: null,
        drop: null,
        expandCandidateId: null,
      });
    },
    reset: () => {
      cancelTimer();

      set({
        status: "idle",
        draggedRow: null,
        tempExpandedIds: new Set(),
        expandCandidateId: null,
        indicator: null,
        drop: null,
        acceptCache: new Map(),
      });
    },
  }));
};

/** Outline drag-and-drop store context */
export const OutlineDndStoreContext = createContext<StoreApi<OutlineDndStore>>(
  createOutlineDndStore()
);

/** Accesses the outline drag-and-drop store value without subscribing */
export const useOutlineDndStoreApi = () => {
  return useContext(OutlineDndStoreContext);
};

/** Subscribes to the outline drag-and-drop store value selected by the selector */
export const useOutlineDndStore = <T>(
  selector: (store: OutlineDndStore) => T
) => {
  return useContextStore(OutlineDndStoreContext, selector);
};
