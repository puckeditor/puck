import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

  it("keeps inline richtext editable while its component is resolving", async () => {
    let resolveUpdatedData: (() => void) | undefined;
    const resolveData = jest.fn(
      async ({ props }: { props: { body: string } }) => {
        if (props.body.includes("updated")) {
          await new Promise<void>((resolve) => {
            resolveUpdatedData = resolve;
          });
        }

        return { props };
      }
    );

    const config: Config = {
      components: {
        RichTextBlock: {
          fields: {
            body: { type: "richtext", contentEditable: true },
          },
          resolveData,
          render: ({ body }) => <div>{body}</div>,
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

    const { appStore } = getInternal();

    const editorElement = await waitFor(() => {
      const element = document.querySelector('[contenteditable="true"]');

      expect(element).toBeInTheDocument();
      return element as HTMLElement;
    });

    fireEvent.focus(editorElement);

    await waitFor(() => {
      expect(appStore.getState().currentRichText?.inlineComponentId).toBe(
        "block-1"
      );
    });

    act(() => {
      const editor = appStore.getState().currentRichText?.editor;

      editor?.commands.insertContent(" updated");
    });

    await waitFor(() => {
      expect(resolveUpdatedData).toBeDefined();
      expect(
        appStore.getState().componentState["block-1"]?.loadingCount
      ).toBeGreaterThan(0);
    });

    // While the real resolver is pending, the inline editor must not be
    // replaced with the read-only rich text renderer.
    expect(document.querySelector('[contenteditable="true"]')).toBe(
      editorElement
    );

    act(() => {
      resolveUpdatedData?.();
    });

    await waitFor(() => {
      expect(
        appStore.getState().componentState["block-1"]?.loadingCount ?? 0
      ).toBe(0);
      expect(editorElement.textContent).toContain("updated");
    });

    // A remounted editor used to restart resolution after each completion.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(resolveData).toHaveBeenCalledTimes(2);
  });
});
