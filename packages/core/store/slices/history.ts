import { AppState, History } from "../../types";
import { generateId } from "../../lib/generate-id";
import { AppStore, useAppStoreApi } from "../";
import { useEffect } from "react";
import { useHotkey } from "../../lib/use-hotkey";

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
};

const EMPTY_HISTORY_INDEX = 0;

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

export const createHistorySlice = (
  set: (newState: Partial<AppStore>) => void,
  get: () => AppStore
): HistorySlice => {
  const record = debounce((state: AppState) => {
    const { histories, index } = get().history;

    const history: History = {
      state,
      id: generateId("history"),
    };

    // Don't use setHistories due to callback
    const newHistories = [...histories.slice(0, index + 1), history];

    set({
      history: {
        ...get().history,
        histories: newHistories,
        index: newHistories.length - 1,
      },
    });
  }, 250);

  return {
    initialAppState: {} as AppState,
    index: EMPTY_HISTORY_INDEX,
    histories: [],
    hasPast: () => get().history.index > EMPTY_HISTORY_INDEX,
    hasFuture: () => get().history.index < get().history.histories.length - 1,
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
      const { history, dispatch } = get();

      if (history.hasPast()) {
        const state = tidyState(
          history.prevHistory()?.state || history.initialAppState
        );

        dispatch({
          type: "set",
          state,
        });

        set({ history: { ...history, index: history.index - 1 } });
      }
    },
    forward: () => {
      const { history, dispatch } = get();

      if (history.hasFuture()) {
        const state = history.nextHistory()?.state;

        dispatch({ type: "set", state: state ? tidyState(state) : {} });

        set({ history: { ...history, index: history.index + 1 } });
      }
    },
    setHistories: (histories: History[]) => {
      const { dispatch, history } = get();

      dispatch({
        type: "set",
        state:
          histories[histories.length - 1]?.state || history.initialAppState,
      });

      set({ history: { ...history, histories, index: histories.length - 1 } });
    },
    setHistoryIndex: (index: number) => {
      const { dispatch, history } = get();

      dispatch({
        type: "set",
        state: history.histories[index]?.state || history.initialAppState,
      });

      set({ history: { ...history, index } });
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
