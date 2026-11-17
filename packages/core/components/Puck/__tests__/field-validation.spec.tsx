import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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

describe("field validation", () => {
  const config: Config = {
    root: {
      fields: {
        title: {
          type: "text",
          validate: (value: string) =>
            value.length > 5 ? "Title is too long" : null,
        },
        description: {
          type: "textarea",
          validate: (value: string) =>
            value ? null : { type: "warning", message: "Add a description" },
        },
        untouched: { type: "text" },
      },
      render: ({ children }) => <div>{children}</div>,
    },
    components: {},
  };

  it("shows the message returned by validate", async () => {
    render(
      <Puck
        config={config}
        data={{ root: { props: { title: "Much too long", description: "" } } }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    // Fields can be mounted more than once, depending on the layout
    const [error] = screen.getAllByText("Title is too long");
    expect(error).toHaveAttribute("data-puck-field-validation", "error");
    expect(error).toHaveAttribute("role", "alert");

    const [warning] = screen.getAllByText("Add a description");
    expect(warning).toHaveAttribute("data-puck-field-validation", "warning");
    expect(warning).toHaveAttribute("role", "status");
  });

  it("shows nothing when the value is valid", async () => {
    const { container } = render(
      <Puck
        config={config}
        data={{ root: { props: { title: "Short", description: "Hello" } } }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    expect(
      container.querySelectorAll("[data-puck-field-validation]")
    ).toHaveLength(0);
  });

  it("updates the message when the value changes", async () => {
    const { container } = render(
      <Puck
        config={config}
        data={{ root: { props: { title: "Short", description: "Hello" } } }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    expect(screen.queryAllByText("Title is too long")).toHaveLength(0);

    const input = container.querySelector<HTMLInputElement>(
      'input[name="title"]'
    )!;

    fireEvent.change(input, { target: { value: "Much too long" } });

    await flush();

    expect(screen.getAllByText("Title is too long").length).toBeGreaterThan(0);

    fireEvent.change(input, { target: { value: "Fine" } });

    await flush();

    expect(screen.queryAllByText("Title is too long")).toHaveLength(0);
  });
});
