// @dnd-kit/dom instantiates a ResizeObserver at module scope
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

import { render } from "@testing-library/react";

import useDragHandle from "../use-drag-handle";
import { DRAG_HANDLE_ATTRIBUTE } from "../../../dom-selectors";

let api: ReturnType<typeof useDragHandle<HTMLDivElement>>;

const Probe = ({
  draggingFromHandle = false,
}: {
  draggingFromHandle?: boolean;
}) => {
  api = useDragHandle<HTMLDivElement>({
    componentRef: { current: null },
    getComponentStyle: () => undefined,
    draggingFromHandle,
  });

  return null;
};

describe("useDragHandle", () => {
  let handle: HTMLButtonElement;

  const isMarked = (el: Element) => el.hasAttribute(DRAG_HANDLE_ATTRIBUTE);

  beforeEach(() => {
    render(<Probe />);

    handle = document.createElement("button");
    document.body.append(handle);
  });

  afterEach(() => {
    handle.remove();
  });

  // The document listener recognizes a handle by this attribute alone, so it
  // has to be applied to whatever element the consumer hands us, including the
  // arbitrary elements a custom action bar may use
  it("marks the handle element so a press on it can be recognized", () => {
    expect(isMarked(handle)).toBe(false);

    api.assignHandleRef(handle);

    expect(isMarked(handle)).toBe(true);
    expect(api.handleRef.current).toBe(handle);
  });

  it("unmarks the handle element when it is detached", () => {
    api.assignHandleRef(handle);
    api.assignHandleRef(null);

    expect(isMarked(handle)).toBe(false);
    expect(api.handleRef.current).toBe(null);
  });

  // The overlay portal rebuilds its element mid-drag, so the handle is swapped
  // without an intervening detach
  it("moves the mark when the handle element is replaced", () => {
    const nextHandle = document.createElement("button");
    document.body.append(nextHandle);

    api.assignHandleRef(handle);
    api.assignHandleRef(nextHandle);

    expect(isMarked(handle)).toBe(false);
    expect(isMarked(nextHandle)).toBe(true);
    expect(api.handleRef.current).toBe(nextHandle);

    nextHandle.remove();
  });
});
