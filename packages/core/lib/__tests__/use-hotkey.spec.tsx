import { renderHook } from "@testing-library/react";
import { monitorHotkeys, useHotkey, useHotkeyStore } from "../use-hotkey";

type Modifiers = {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

const keydown = (code: string, modifiers: Modifiers = {}) =>
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      code,
      bubbles: true,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      ...modifiers,
    })
  );

describe("monitorHotkeys", () => {
  let cleanup: () => void;

  beforeAll(() => {
    cleanup = monitorHotkeys(document);
  });

  afterAll(() => {
    cleanup();
  });

  beforeEach(() => {
    // The store is a module singleton, so wipe held keys and registered
    // triggers between tests for a clean slate. `useHotkey`'s effect never
    // removes its trigger, so this is the only reliable reset for `triggers`.
    useHotkeyStore.setState({ held: {}, triggers: {} });
  });

  it("reports modifier state on jsdom KeyboardEvents", () => {
    // Guards the tests below: they are meaningless if jsdom drops these fields.
    const event = new KeyboardEvent("keydown", {
      code: "MetaLeft",
      metaKey: true,
    });

    expect(event.code).toBe("MetaLeft");
    expect(event.metaKey).toBe(true);
    expect(event.getModifierState("AltGraph")).toBe(false);
  });

  it("triggers a meta combo when both keys are held", () => {
    const cb = jest.fn();
    renderHook(() => useHotkey({ meta: true, i: true }, cb));

    keydown("MetaLeft", { metaKey: true });
    keydown("KeyI", { metaKey: true });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("triggers a ctrl combo when both keys are held (Windows)", () => {
    const cb = jest.fn();
    renderHook(() => useHotkey({ ctrl: true, i: true }, cb));

    keydown("ControlLeft", { ctrlKey: true });
    keydown("KeyI", { ctrlKey: true });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not fire a meta combo when 'i' is pressed alone after meta was left stuck", () => {
    const cb = jest.fn();
    renderHook(() => useHotkey({ meta: true, i: true }, cb));

    // Meta is pressed, then the user switches windows so its keyup is never
    // seen and meta stays "held" in the store.
    keydown("MetaLeft", { metaKey: true });

    // Back in the editor the user types 'i' on its own. The event reports
    // metaKey: false, so the combo must not fire.
    keydown("KeyI", { metaKey: false });

    expect(cb).not.toHaveBeenCalled();

    // Prove the trigger is still live so the assertion above is meaningful: a
    // genuine meta+i must still fire the same callback.
    keydown("MetaLeft", { metaKey: true });
    keydown("KeyI", { metaKey: true });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not fire a ctrl combo when 'i' is pressed alone after ctrl was left stuck", () => {
    const cb = jest.fn();
    renderHook(() => useHotkey({ ctrl: true, i: true }, cb));

    keydown("ControlLeft", { ctrlKey: true });
    keydown("KeyI", { ctrlKey: false });

    expect(cb).not.toHaveBeenCalled();

    keydown("ControlLeft", { ctrlKey: true });
    keydown("KeyI", { ctrlKey: true });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("fires a meta combo when the modifier is genuinely still held after returning to the window", () => {
    const cb = jest.fn();
    renderHook(() => useHotkey({ meta: true, i: true }, cb));

    // The meta keydown was missed (pressed while another window had focus), but
    // 'i' arrives with metaKey: true, so reconciliation restores meta and fires.
    keydown("KeyI", { metaKey: true });

    expect(cb).toHaveBeenCalledTimes(1);
  });
});
