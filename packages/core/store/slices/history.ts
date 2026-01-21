import { AppState, History } from "../../types";
import { generateId } from "../../lib/generate-id";
import { AppStore, useAppStoreApi } from "../";
import { useEffect } from "react";
import { useHotkey } from "../../lib/use-hotkey";
import { enablePatches, produceWithPatches, applyPatches, Patch } from "immer";

// Enable Immer patches for efficient history storage
enablePatches();

/**
 * A history entry using patches for memory-efficient storage.
 * Only stores the diff between states instead of full snapshots.
 */
export type PatchHistoryEntry = {
  id: string;
  patches: Patch[];
  inversePatches: Patch[];
  timestamp: number;
};

export type HistorySlice<D = any> = {
  index: number;
  hasPast: () => boolean;
  hasFuture: () => boolean;
  histories: History<D>[];
  record: (data: D) => void;
  back: VoidFunction;
  forward: VoidFunction;
  currentHistory: () => History;
  nextHistory: () => History<D> | null;
  prevHistory: () => History<D> | null;
  setHistories: (histories: History[]) => void;
  setHistoryIndex: (index: number) => void;
  initialAppState: D;
  // New patch-based properties
  patchEntries: PatchHistoryEntry[];
  maxHistoryLength: number;
  usePatchHistory: boolean;
};

const EMPTY_HISTORY_INDEX = 0;
const DEFAULT_MAX_HISTORY_LENGTH = 100;

function debounce(func: Function, timeout = 300) {
  let timer: NodeJS.Timeout;

  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

export type PuckHistory = {
  back: VoidFunction;
  forward: VoidFunction;
  setHistories: (histories: History[]) => void;
  setHistoryIndex: (index: number) => void;
  HistorySlice: HistorySlice;
};

// Tidy the state before going back or forward
const tidyState = (state: AppState): AppState => {
  return {
    ...state,
    ui: {
      ...state.ui,
      field: {
        ...state.ui.field,
        focus: null,
      },
    },
  };
};

/**
 * Reconstruct state from base state and patches up to a given index.
 */
function reconstructStateFromPatches(
  baseState: AppState,
  patchEntries: PatchHistoryEntry[],
  targetIndex: number
): AppState {
  let state = baseState;
  for (let i = 0; i <= targetIndex; i++) {
    if (patchEntries[i]) {
      state = applyPatches(state, patchEntries[i].patches);
    }
  }
  return state;
}

export const createHistorySlice = (
  set: (newState: Partial<AppStore>) => void,
  get: () => AppStore
): HistorySlice => {
  // Track the previous state for generating patches
  let previousState: AppState | null = null;

  const record = debounce((state: AppState) => {
    const { history } = get();

    // Use patch-based history for better memory efficiency
    if (history.usePatchHistory) {
      if (!previousState) {
        previousState = state;
        // Store the initial state as the first entry
        const entry: PatchHistoryEntry = {
          id: generateId("history"),
          patches: [],
          inversePatches: [],
          timestamp: Date.now(),
        };

        set({
          history: {
            ...history,
            patchEntries: [entry],
            index: 0,
            // Also maintain legacy format for compatibility
            histories: [{ id: entry.id, state }],
          },
        });
        return;
      }

      // Generate patches using Immer
      try {
        const [, patches, inversePatches] = produceWithPatches(
          previousState,
          (draft) => {
            // Copy all properties from new state to draft
            Object.keys(state).forEach((key) => {
              (draft as any)[key] = (state as any)[key];
            });
          }
        );

        // Skip if no actual changes
        if (patches.length === 0) {
          return;
        }

        const entry: PatchHistoryEntry = {
          id: generateId("history"),
          patches,
          inversePatches,
          timestamp: Date.now(),
        };

        // Trim future entries and add new one
        let newPatchEntries = [
          ...history.patchEntries.slice(0, history.index + 1),
          entry,
        ];

        // Enforce max history length
        if (newPatchEntries.length > history.maxHistoryLength) {
          // Keep only the most recent entries
          newPatchEntries = newPatchEntries.slice(-history.maxHistoryLength);
        }

        // Also maintain legacy format (but with structural sharing via Immer)
        const legacyHistory: History = {
          state,
          id: entry.id,
        };
        const newHistories = [
          ...history.histories.slice(0, history.index + 1),
          legacyHistory,
        ].slice(-history.maxHistoryLength);

        set({
          history: {
            ...history,
            patchEntries: newPatchEntries,
            histories: newHistories,
            index: newPatchEntries.length - 1,
          },
        });

        previousState = state;
      } catch (e) {
        // Fallback to legacy behavior if patch generation fails
        console.warn("Patch generation failed, using legacy history:", e);
        recordLegacy(state);
      }
    } else {
      recordLegacy(state);
    }
  }, 250);

  // Legacy record function for backward compatibility
  const recordLegacy = (state: AppState) => {
    const { histories, index } = get().history;

    const historyEntry: History = {
      state,
      id: generateId("history"),
    };

    const newHistories = [...histories.slice(0, index + 1), historyEntry];

    set({
      history: {
        ...get().history,
        histories: newHistories,
        index: newHistories.length - 1,
      },
    });
  };

  return {
    initialAppState: {} as AppState,
    index: EMPTY_HISTORY_INDEX,
    histories: [],
    patchEntries: [],
    maxHistoryLength: DEFAULT_MAX_HISTORY_LENGTH,
    usePatchHistory: true, // Enable by default for memory efficiency

    hasPast: () => get().history.index > EMPTY_HISTORY_INDEX,
    hasFuture: () => {
      const history = get().history;
      // Always use histories.length as source of truth for backward compatibility
      return history.index < history.histories.length - 1;
    },
    prevHistory: () => {
      const { history } = get();

      return history.hasPast() ? history.histories[history.index - 1] : null;
    },
    nextHistory: () => {
      const s = get().history;

      return s.hasFuture() ? s.histories[s.index + 1] : null;
    },
    currentHistory: () => get().history.histories[get().history.index],
    back: () => {
      const { history, dispatch, state: currentState } = get();

      if (history.hasPast()) {
        let newState: AppState;

        if (history.usePatchHistory && history.patchEntries.length > 0) {
          // Apply inverse patches to go back
          const currentEntry = history.patchEntries[history.index];
          if (currentEntry && currentEntry.inversePatches.length > 0) {
            newState = applyPatches(currentState, currentEntry.inversePatches);
          } else {
            // Fallback to legacy
            newState =
              history.prevHistory()?.state || history.initialAppState;
          }
        } else {
          newState =
            history.prevHistory()?.state || history.initialAppState;
        }

        dispatch({
          type: "set",
          state: tidyState(newState),
        });

        set({ history: { ...history, index: history.index - 1 } });

        // Update previousState for patch tracking
        previousState = newState;
      }
    },
    forward: () => {
      const { history, dispatch, state: currentState } = get();

      if (history.hasFuture()) {
        let newState: AppState;

        if (history.usePatchHistory && history.patchEntries.length > 0) {
          // Apply patches to go forward
          const nextEntry = history.patchEntries[history.index + 1];
          if (nextEntry && nextEntry.patches.length > 0) {
            newState = applyPatches(currentState, nextEntry.patches);
          } else {
            // Fallback to legacy
            const nextHistoryState = history.nextHistory()?.state;
            newState = nextHistoryState ?? ({} as AppState);
          }
        } else {
          const nextHistoryState = history.nextHistory()?.state;
          newState = nextHistoryState ?? ({} as AppState);
        }

        dispatch({ type: "set", state: tidyState(newState) });

        set({ history: { ...history, index: history.index + 1 } });

        // Update previousState for patch tracking
        previousState = newState;
      }
    },
    setHistories: (histories: History[]) => {
      const { dispatch, history } = get();

      dispatch({
        type: "set",
        state:
          histories[histories.length - 1]?.state || history.initialAppState,
      });

      // Also reset patch entries when setting histories directly
      set({
        history: {
          ...history,
          histories,
          patchEntries: [], // Clear patches when setting directly
          index: histories.length - 1,
        },
      });

      // Reset previousState
      previousState = histories[histories.length - 1]?.state || null;
    },
    setHistoryIndex: (index: number) => {
      const { dispatch, history } = get();

      dispatch({
        type: "set",
        state: history.histories[index]?.state || history.initialAppState,
      });

      set({ history: { ...history, index } });

      // Update previousState
      previousState = history.histories[index]?.state || null;
    },
    record,
  };
};

export function useRegisterHistorySlice(
  appStore: ReturnType<typeof useAppStoreApi>,
  {
    histories,
    index,
    initialAppState,
  }: {
    histories: History<any>[];
    index: number;
    initialAppState: AppState;
  }
) {
  useEffect(
    () =>
      appStore.setState({
        history: {
          ...appStore.getState().history,
          histories,
          index,
          initialAppState,
        },
      }),
    [histories, index, initialAppState]
  );

  const back = () => {
    appStore.getState().history.back();
  };

  const forward = () => {
    appStore.getState().history.forward();
  };

  useHotkey({ meta: true, z: true }, back);
  useHotkey({ meta: true, shift: true, z: true }, forward);
  useHotkey({ meta: true, y: true }, forward);

  useHotkey({ ctrl: true, z: true }, back);
  useHotkey({ ctrl: true, shift: true, z: true }, forward);
  useHotkey({ ctrl: true, y: true }, forward);
}
