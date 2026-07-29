import { render } from "@testing-library/react";

import { useDragHandleListener } from "../use-drag-handle-listener";
import { DRAG_HANDLE_ATTRIBUTE } from "../../../dom-selectors";

jest.mock("../../../../store", () => ({
  useAppStore: (selector: (s: any) => any) => selector({ status: "READY" }),
}));

// the handles live in the preview frame's document; in jsdom that's the only one
jest.mock("../../../get-frame", () => ({
  getFrame: () => document,
}));

let getIsDraggingFromHandle: () => boolean;

const Probe = () => {
  ({ getIsDraggingFromHandle } = useDragHandleListener());
  return null;
};

// jsdom has no PointerEvent; MouseEvent is close enough for these listeners
const fire = (target: EventTarget, type: string) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true }));

describe("useDragHandleListener", () => {
  let handle: HTMLButtonElement;
  let inner: HTMLSpanElement;
  let elsewhere: HTMLDivElement;

  beforeEach(() => {
    render(<Probe />);

    handle = document.createElement("button");
    handle.setAttribute(DRAG_HANDLE_ATTRIBUTE, "");
    inner = document.createElement("span"); // e.g. the grip icon
    handle.append(inner);

    elsewhere = document.createElement("div");
    document.body.append(handle, elsewhere);
  });

  afterEach(() => {
    handle.remove();
    elsewhere.remove();
  });

  it("reports a press that started on a handle", () => {
    expect(getIsDraggingFromHandle()).toBe(false);

    fire(handle, "pointerdown");
    expect(getIsDraggingFromHandle()).toBe(true);
  });

  it("reports a press that started on a child of the handle", () => {
    fire(inner, "pointerdown");

    expect(getIsDraggingFromHandle()).toBe(true);
  });

  it("does not report a press that started elsewhere", () => {
    fire(elsewhere, "pointerdown");

    expect(getIsDraggingFromHandle()).toBe(false);
  });

  it("stops reporting once the press is released", () => {
    fire(handle, "pointerdown");
    fire(handle, "pointerup");

    expect(getIsDraggingFromHandle()).toBe(false);
  });

  // dnd-kit captures the pointer on the document body once a drag activates, so
  // the release is never delivered to the handle itself
  it("stops reporting when the release lands off the handle", () => {
    fire(handle, "pointerdown");
    fire(elsewhere, "pointerup");

    expect(getIsDraggingFromHandle()).toBe(false);
  });

  it("stops reporting on pointercancel", () => {
    fire(handle, "pointerdown");
    fire(elsewhere, "pointercancel");

    expect(getIsDraggingFromHandle()).toBe(false);
  });

  // Belt and braces: even if a release is never seen (pointer lost, window
  // blur), the next press re-evaluates, so the flag can't be stale when the
  // next drag starts
  it("re-evaluates on the next press even if no release was seen", () => {
    fire(handle, "pointerdown");
    expect(getIsDraggingFromHandle()).toBe(true);

    fire(elsewhere, "pointerdown");
    expect(getIsDraggingFromHandle()).toBe(false);
  });
});
