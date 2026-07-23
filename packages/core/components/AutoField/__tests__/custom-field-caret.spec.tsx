import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";

jest.mock("../../Puck/styles.module.css");
jest.mock("@dnd-kit/react");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false, // default → desktop
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
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

// Silence the noisy "Could not parse CSS stylesheet" jsdom warnings
const originalConsoleError = console.error;
jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  if (
    args.some((arg) => String(arg).includes("Could not parse CSS stylesheet"))
  ) {
    return;
  }

  originalConsoleError(...(args as Parameters<typeof console.error>));
});

import { Puck } from "../../Puck";

describe("AutoField custom field", () => {
  // Records the `value` prop passed to the custom field on every render.
  const renderedValues: unknown[] = [];

  const config: Config = {
    root: {
      fields: {
        title: {
          type: "custom",
          render: ({ id, value, onChange }) => {
            renderedValues.push(value);

            return (
              <input
                data-testid="custom-input"
                id={id}
                value={(value as string) ?? ""}
                onChange={(e) => onChange(e.currentTarget.value)}
              />
            );
          },
        },
      },
      render: ({ children }) => <div>{children}</div>,
    },
    components: {},
  };

  afterEach(() => {
    cleanup();
    renderedValues.length = 0;
  });

  const flush = () => act(async () => {});

  // A controlled <input> keeps its caret only if its `value` prop reflects the
  // latest keystroke on the same render. Custom fields read their value from
  // the field store, which was previously only updated after an async
  // round-trip through the app store — so the input re-rendered a tick later
  // with a stale value, resetting the caret to the end on every keystroke
  // (#1642). This asserts the value is mirrored back synchronously.
  it("updates a custom field's value synchronously on change", async () => {
    render(
      <Puck
        config={config}
        data={{ root: { props: { title: "abcdef" } } }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    const input = screen.getAllByTestId("custom-input")[0] as HTMLInputElement;

    expect(input.value).toBe("abcdef");

    // Emulate the browser inserting "X" between "abc" and "def".
    fireEvent.change(input, { target: { value: "abcXdef" } });

    // Without awaiting the async app-store round-trip, the custom field should
    // already have re-rendered with the new value.
    expect(renderedValues[renderedValues.length - 1]).toBe("abcXdef");

    await flush();

    expect(input.value).toBe("abcXdef");
  });
});
