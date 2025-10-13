import { useEffect } from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const keys = [
  "ctrl",
  "meta",
  "shift",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "delete",
  "backspace",
] as const;

type KeyStrict = (typeof keys)[number];
type KeyMapStrict = Partial<Record<KeyStrict, boolean>>;
type KeyMap = Partial<Record<string, boolean>>;
type KeyCodeMap = Record<string, KeyStrict>;

const keyCodeMap: KeyCodeMap = {
  ControlLeft: "ctrl",
  ControlRight: "ctrl",
  MetaLeft: "meta",
  MetaRight: "meta",
  ShiftLeft: "shift",
  ShiftRight: "shift",
  KeyA: "a",
  KeyB: "b",
  KeyC: "c",
  KeyD: "d",
  KeyE: "e",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyI: "i",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  KeyM: "m",
  KeyN: "n",
  KeyO: "o",
  KeyP: "p",
  KeyQ: "q",
  KeyR: "r",
  KeyS: "s",
  KeyT: "t",
  KeyU: "u",
  KeyV: "v",
  KeyW: "w",
  KeyX: "x",
  KeyY: "y",
  KeyZ: "z",
  Delete: "delete",
  Backspace: "backspace",
};

const useHotkeyStore = create<{
  held: KeyMap;
  hold: (key: string) => void;
  release: (key: string) => void;
  reset: (held?: KeyMapStrict) => void;
  triggers: Record<string, { combo: KeyMapStrict; cb: Function }>;
}>()(
  subscribeWithSelector((set) => ({
    held: {},
    hold: (key) =>
      set((s) => (s.held[key] ? s : { held: { ...s.held, [key]: true } })),
    release: (key) =>
      set((s) => (s.held[key] ? { held: { ...s.held, [key]: false } } : s)),
    reset: (held = {}) => set(() => ({ held })),
    triggers: {},
  }))
);

export const monitorHotkeys = (doc: Document) => {
  const onKeyDown = (e: KeyboardEvent) => {
    const key = keyCodeMap[e.code];

    if (key) {
      useHotkeyStore.getState().hold(key);

      const { held, triggers } = useHotkeyStore.getState();

      Object.values(triggers).forEach(({ combo, cb }) => {
        const conditionMet =
          Object.entries(combo).every(
            ([key, value]) => value === !!held[key]
          ) &&
          Object.entries(held).every(
            ([key, value]) => value === !!(combo as KeyMap)[key]
          );

        // Call hotkey with event; skip preventDefault if callback returns false to allow native input behavior.
        if (conditionMet) {
          const handled = cb(e);
          if (handled !== false) {
            e.preventDefault();
          }
        }
      });

      // Only retain hold on modifiers
      if (key !== "meta" && key !== "ctrl" && key !== "shift") {
        useHotkeyStore.getState().release(key);
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = keyCodeMap[e.code];

    if (key) {
      if (key === "meta") {
        // Release all keys when releasing meta, as macOS prevents keyUp detection from other keys when meta is held
        useHotkeyStore.getState().reset();
      } else {
        useHotkeyStore.getState().release(key);
      }
    }
  };

  const onVisibilityChanged = (e: Event) => {
    // Reset keys when tab changes
    if (document.visibilityState === "hidden") {
      useHotkeyStore.getState().reset();
    }
  };

  const onBlur = () => {
    useHotkeyStore.getState().reset();
  };

  window.addEventListener("blur", onBlur);
  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("keyup", onKeyUp);
  doc.addEventListener("visibilitychange", onVisibilityChanged);

  return () => {
    doc.removeEventListener("keydown", onKeyDown);
    doc.removeEventListener("keyup", onKeyUp);
    doc.removeEventListener("visibilitychange", onVisibilityChanged);
    window.removeEventListener("blur", onBlur);
  };
};

export const useMonitorHotkeys = () => {
  useEffect(() => monitorHotkeys(document), []);
};

export const useHotkey = (combo: KeyMapStrict, cb: Function) => {
  useEffect(
    () =>
      useHotkeyStore.setState((s) => ({
        triggers: {
          ...s.triggers,
          [`${Object.keys(combo).join("+")}`]: { combo, cb },
        },
      })),
    []
  );
};
