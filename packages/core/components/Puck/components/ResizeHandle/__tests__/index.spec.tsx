import { render, fireEvent } from "@testing-library/react";
import { ResizeHandle } from "../index";

jest.mock("../styles.module.css");
jest.mock("../styles.css", () => ({}));
jest.mock("../../../../../lib/frame-context", () => ({
  useCanvasFrame: () => ({ frameRef: { current: null } }),
}));
jest.mock("../../../../../lib", () => ({
  useResetAutoZoom: () => jest.fn(),
}));

const renderHandle = () => {
  const onResize = jest.fn();
  const onResizeEnd = jest.fn();

  const result = render(
    <ResizeHandle
      position="left"
      sidebarRef={{ current: null }}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
    />
  );

  const handle = result.container.firstChild as HTMLElement;

  return { ...result, handle, onResize, onResizeEnd };
};

describe("ResizeHandle", () => {
  afterEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.getElementById("resize-overlay")?.remove();
  });

  it("cleans up the drag when the mouse is released", () => {
    const { handle, onResize, onResizeEnd } = renderHandle();

    fireEvent.mouseDown(handle, { clientX: 100 });
    expect(document.getElementById("resize-overlay")).not.toBeNull();

    fireEvent.mouseUp(document);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(document.getElementById("resize-overlay")).toBeNull();
    expect(document.body.style.cursor).toBe("");

    fireEvent.mouseMove(document, { clientX: 150 });
    expect(onResize).not.toHaveBeenCalled();
  });

  it("cleans up the drag when unmounted mid-drag", () => {
    const { handle, unmount, onResize, onResizeEnd } = renderHandle();

    fireEvent.mouseDown(handle, { clientX: 100 });
    unmount();

    expect(document.getElementById("resize-overlay")).toBeNull();
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");

    fireEvent.mouseMove(document, { clientX: 150 });
    fireEvent.mouseUp(document);
    expect(onResize).not.toHaveBeenCalled();
    expect(onResizeEnd).not.toHaveBeenCalled();
  });
});
