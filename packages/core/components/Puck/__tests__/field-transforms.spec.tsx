import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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

const flush = () => act(async () => {});

describe("Puck fieldTransforms - edit canvas", () => {
  afterEach(() => {
    cleanup();
  });

  // Puck defaults to previewMode "edit", so this renders through EditorPage.
  // The edit canvas root must run user transforms just like the interactive
  // <Render> path does, otherwise flipping preview mode changes the root.
  it("applies a user field transform to root props in edit mode", async () => {
    const config: Config = {
      root: {
        fields: { title: { type: "text" } },
        render: ({ title }: any) => (
          <header data-testid="root-render">{title}</header>
        ),
      },
      components: {
        Text: {
          fields: { text: { type: "text" } },
          render: ({ text }: any) => <p>{text}</p>,
        },
      },
    };

    const data: Data = {
      root: { props: { title: "Root Title" } },
      content: [{ type: "Text", props: { id: "text-1", text: "Body" } }],
    };

    render(
      <Puck
        config={config}
        data={data}
        iframe={{ enabled: false }}
        fieldTransforms={{
          text: ({ value }: any) => <mark>{value}</mark>,
        }}
      />
    );
    await flush();

    await waitFor(() => {
      expect(screen.getByTestId("root-render")).toBeInTheDocument();
    });

    const rootRender = screen.getByTestId("root-render");
    // The transform wraps the value in <mark>, so a raw string means the root
    // was never transformed.
    expect(rootRender.querySelector("mark")).not.toBeNull();
    expect(rootRender).toHaveTextContent("Root Title");
  });
});
