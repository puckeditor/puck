import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

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

const originalConsoleError = console.error;
const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation((...args: unknown[]) => {
    if (
      args.some((arg) => String(arg).includes("Could not parse CSS stylesheet"))
    ) {
      return;
    }

    originalConsoleError(...(args as Parameters<typeof console.error>));
  });

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

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { Puck } from "../index";

const flush = () => act(async () => {});

afterEach(() => cleanup());

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("component positioning", () => {
  const config: Config = {
    root: {
      render: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    },
    components: {
      Static: {
        inline: true,
        render: ({ puck }) => (
          <div ref={puck.dragRef} data-testid="static">
            Static
          </div>
        ),
      },
      Fixed: {
        inline: true,
        render: ({ puck }) => (
          <div
            ref={puck.dragRef}
            data-testid="fixed"
            style={{ position: "fixed" }}
          >
            Fixed
          </div>
        ),
      },
      Absolute: {
        inline: true,
        render: ({ puck }) => (
          <div
            ref={puck.dragRef}
            data-testid="absolute"
            style={{ position: "absolute" }}
          >
            Absolute
          </div>
        ),
      },
      Sticky: {
        inline: true,
        render: ({ puck }) => (
          <div
            ref={puck.dragRef}
            data-testid="sticky"
            style={{ position: "sticky" }}
          >
            Sticky
          </div>
        ),
      },
    },
  };

  const data = {
    root: { props: {} },
    content: [
      { type: "Static", props: { id: "Static-1" } },
      { type: "Fixed", props: { id: "Fixed-1" } },
      { type: "Absolute", props: { id: "Absolute-1" } },
      { type: "Sticky", props: { id: "Sticky-1" } },
    ],
  };

  it("doesn't set an inline position on components", async () => {
    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);

    await flush();

    const el = screen.getByTestId("static");

    // The default position comes from the stylesheet, so it can be overridden
    expect(el).toHaveAttribute("data-puck-component", "Static-1");
    expect(el.style.position).toBe("");
  });

  it("preserves the position of positioned components", async () => {
    render(<Puck config={config} data={data} iframe={{ enabled: false }} />);

    await flush();

    expect(screen.getByTestId("fixed")).toHaveAttribute(
      "data-puck-component",
      "Fixed-1"
    );

    expect(screen.getByTestId("fixed").style.position).toBe("fixed");
    expect(screen.getByTestId("absolute").style.position).toBe("absolute");
    expect(screen.getByTestId("sticky").style.position).toBe("sticky");
  });
});
