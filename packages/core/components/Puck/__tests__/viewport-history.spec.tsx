import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { Config, Data } from "../../../types";
import { rootDroppableId } from "../../../lib/root-droppable-id";
import { useGetPuck } from "../../../lib/use-puck";
import "@testing-library/jest-dom";

jest.mock("../styles.module.css");

jest.mock("@dnd-kit/react", () => {
  const original = jest.requireActual("@dnd-kit/react");
  return {
    ...original,
    DragDropProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useDroppable: () => ({
      ref: () => undefined,
      setNodeRef: () => undefined,
      isOver: false,
    }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => undefined,
      isDragging: false,
    }),
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});

import { Puck } from "../index";

const config: Config = {
  components: {
    Text: {
      fields: { text: { type: "text" } },
      render: ({ text }) => <p>{text}</p>,
    },
  },
};

const data: Data = {
  root: { props: {} },
  content: [{ type: "Text", props: { id: "text-1", text: "Hello" } }],
};

// Past the history slice's 250ms record debounce.
const waitForHistoryRecord = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 400)));

let getPuck: ReturnType<typeof useGetPuck>;

const CaptureGetPuck = ({ children }: { children: React.ReactNode }) => {
  getPuck = useGetPuck();
  return <>{children}</>;
};

/**
 * A host that re-renders on every change (e.g. to track unsaved changes) and
 * passes `iframe` inline, so every render hands Puck a new `iframe` object.
 */
const Host = ({ inlineViewports = false }: { inlineViewports?: boolean }) => {
  const [, setChanges] = useState(0);

  return (
    <Puck
      config={config}
      data={data}
      iframe={{ enabled: true, waitForStyles: false }}
      // Also a new array per render, which legitimately re-runs the
      // closest-viewport effect.
      viewports={
        inlineViewports
          ? [
              { width: 360, height: "auto" },
              { width: 1280, height: "auto" },
            ]
          : undefined
      }
      onChange={() => setChanges((n) => n + 1)}
      overrides={{ headerActions: CaptureGetPuck }}
    />
  );
};

describe("Canvas viewport selection and undo history", () => {
  beforeEach(() => {
    // The closest-viewport effect bails out without a measurable frame.
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 1000, height: 800 } as DOMRect);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it("undo after the first structural change restores the loaded data", async () => {
    render(<Host />);
    await waitForHistoryRecord();

    act(() => {
      getPuck().dispatch({
        type: "duplicate",
        sourceIndex: 0,
        sourceZone: rootDroppableId,
      });
    });
    await waitForHistoryRecord();
    expect(getPuck().appState.data.content).toHaveLength(2);

    act(() => getPuck().history.back());

    expect(getPuck().appState.data.content).toHaveLength(1);
  });

  it("undo restores the loaded data even when the viewport effect re-runs", async () => {
    render(<Host inlineViewports />);
    await waitForHistoryRecord();

    act(() => {
      getPuck().dispatch({
        type: "duplicate",
        sourceIndex: 0,
        sourceZone: rootDroppableId,
      });
    });
    await waitForHistoryRecord();
    expect(getPuck().appState.data.content).toHaveLength(2);

    act(() => getPuck().history.back());

    expect(getPuck().appState.data.content).toHaveLength(1);
  });

  it("keeps a viewport the user picked when the host re-renders on change", async () => {
    render(<Host />);
    await waitForHistoryRecord();

    act(() => {
      getPuck().dispatch({
        type: "setUi",
        ui: {
          viewports: {
            ...getPuck().appState.ui.viewports,
            current: { width: 360, height: "auto" },
          },
        },
      });
    });

    act(() => {
      getPuck().dispatch({
        type: "duplicate",
        sourceIndex: 0,
        sourceZone: rootDroppableId,
      });
    });
    await waitForHistoryRecord();

    expect(getPuck().appState.ui.viewports.current.width).toBe(360);
  });
});
