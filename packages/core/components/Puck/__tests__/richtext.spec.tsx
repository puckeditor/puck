import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { Config, Data } from "../../../types";
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

const originalConsoleError = console.error;
jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  if (
    args.some((arg) => String(arg).includes("Could not parse CSS stylesheet"))
  ) {
    return;
  }
  originalConsoleError(...(args as Parameters<typeof console.error>));
});

jest.spyOn(console, "warn").mockImplementation(() => {});

import { Puck } from "../index";
import { AppStoreApi } from "../../../store";

type PuckInternal = {
  appStore: AppStoreApi;
};

const getInternal = () => {
  return (window as any).__PUCK_INTERNAL_DO_NOT_USE as PuckInternal;
};

const flush = () => act(async () => {});

const dispatchReplace = (
  appStore: AppStoreApi,
  componentId: string,
  data: any
) => {
  const node = appStore.getState().state.indexes.nodes[componentId];
  const zoneCompound = `${node.parentId}:${node.zone}`;
  const index = appStore
    .getState()
    .state.indexes.zones[zoneCompound].contentIds.indexOf(componentId);

  appStore.getState().dispatch({
    type: "replace",
    data,
    destinationIndex: index,
    destinationZone: zoneCompound,
  });
};

describe("Puck - richtext programmatic updates", () => {
  afterEach(() => {
    cleanup();
  });

  it("updates the preview when a richtext field is changed via dispatch", async () => {
    const config: Config = {
      components: {
        RichTextBlock: {
          fields: {
            body: { type: "richtext", contentEditable: false },
          },
          render: ({ body }) => <div data-testid="richtext-output">{body}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "RichTextBlock",
          props: { id: "block-1", body: "<p>Hello world</p>" },
        },
      ],
    };

    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);
    await flush();

    await waitFor(() => {
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    const { appStore } = getInternal();

    act(() => {
      dispatchReplace(appStore, "block-1", {
        type: "RichTextBlock",
        props: { id: "block-1", body: "<p>Updated content</p>" },
      });
    });
    await flush();

    await waitFor(() => {
      expect(screen.getByText("Updated content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
  });

  it("updates the preview when a contentEditable richtext field is changed via dispatch", async () => {
    const config: Config = {
      components: {
        RichTextBlock: {
          fields: {
            body: { type: "richtext" },
          },
          render: ({ body }) => <div data-testid="richtext-output">{body}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "RichTextBlock",
          props: { id: "block-1", body: "<p>Hello world</p>" },
        },
      ],
    };

    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);
    await flush();

    await waitFor(() => {
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    const { appStore } = getInternal();

    act(() => {
      dispatchReplace(appStore, "block-1", {
        type: "RichTextBlock",
        props: { id: "block-1", body: "<p>Updated content</p>" },
      });
    });
    await flush();

    await waitFor(() => {
      expect(screen.getByText("Updated content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
  });

  it("updates richtext when value transitions from empty string to content", async () => {
    const config: Config = {
      components: {
        Block: {
          fields: {
            body: { type: "richtext", contentEditable: false },
          },
          render: ({ body }) => <div data-testid="output">{body}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "Block",
          props: { id: "block-1", body: "" },
        },
      ],
    };

    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);
    await flush();

    const { appStore } = getInternal();

    act(() => {
      dispatchReplace(appStore, "block-1", {
        type: "Block",
        props: { id: "block-1", body: "<p>No longer empty</p>" },
      });
    });
    await flush();

    await waitFor(() => {
      expect(screen.getByText("No longer empty")).toBeInTheDocument();
    });
  });

  it("updates richtext when value is set to plain text (no HTML tags)", async () => {
    const config: Config = {
      components: {
        Block: {
          fields: {
            body: { type: "richtext", contentEditable: false },
          },
          render: ({ body }) => <div data-testid="output">{body}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "Block",
          props: { id: "block-1", body: "<p>HTML content</p>" },
        },
      ],
    };

    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);
    await flush();

    await waitFor(() => {
      expect(screen.getByText("HTML content")).toBeInTheDocument();
    });

    const { appStore } = getInternal();

    act(() => {
      dispatchReplace(appStore, "block-1", {
        type: "Block",
        props: { id: "block-1", body: "Plain text value" },
      });
    });
    await flush();

    await waitFor(() => {
      expect(screen.getByText("Plain text value")).toBeInTheDocument();
    });
  });
});

// <Activity> is only available in React 19.2+
const Activity:
  | React.ComponentType<{
      mode: "visible" | "hidden";
      children: React.ReactNode;
    }>
  | undefined = (React as any).Activity;

const describeIfActivity = Activity ? describe : describe.skip;

describeIfActivity("Puck - richtext inside <Activity>", () => {
  afterEach(() => {
    cleanup();
  });

  const wait = (ms: number) =>
    act(() => new Promise((resolve) => setTimeout(resolve, ms)));

  it("recovers the editor after being hidden and shown again", async () => {
    if (!Activity) return;

    const config: Config = {
      components: {
        Text: {
          fields: {
            body: { type: "richtext", contentEditable: true },
          },
          render: ({ body }) => <div data-testid="output">{body}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [{ type: "Text", props: { id: "t", body: "<p>Hello</p>" } }],
    };

    let setVisible: (visible: boolean) => void = () => {};

    const App = () => {
      const [visible, _setVisible] = React.useState(true);
      setVisible = _setVisible;

      return (
        <Activity mode={visible ? "visible" : "hidden"}>
          <Puck config={config} data={data} iframe={{ enabled: false }} />
        </Activity>
      );
    };

    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);

    try {
      const { container } = render(<App />);
      await flush();

      const getEditor = () =>
        container.querySelector<HTMLElement>(".ProseMirror");

      await waitFor(() => {
        expect(getEditor()).toHaveTextContent("Hello");
      });

      for (let i = 0; i < 3; i++) {
        act(() => setVisible(false));
        // Give Tiptap time to destroy the editor
        await wait(20);
        act(() => setVisible(true));
        await flush();

        await waitFor(() => {
          expect(getEditor()).toHaveTextContent("Hello");
        });
        expect(getEditor()).toHaveAttribute("contenteditable", "true");
      }

      expect(errors).toEqual([]);

      const { appStore } = getInternal();

      act(() => {
        dispatchReplace(appStore, "t", {
          type: "Text",
          props: { id: "t", body: "<p>Updated content</p>" },
        });
      });
      await flush();

      await waitFor(() => {
        expect(getEditor()).toHaveTextContent("Updated content");
      });
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});
