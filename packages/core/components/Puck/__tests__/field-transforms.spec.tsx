import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
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

jest.spyOn(console, "warn").mockImplementation(() => {});

import { Puck } from "../index";

const config: Config = {
  components: {
    Heading: {
      fields: { title: { type: "text" } },
      defaultProps: { title: "Something" },
      render: ({ title }) => <div>{title}</div>,
    },
  },
};

const data: Data = {
  root: { props: {} },
  content: [{ type: "Heading", props: { id: "heading-1", title: "Hello" } }],
};

describe("Puck - fieldTransforms with hooks", () => {
  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockClear();
  });

  it("renders a transform that uses hooks without throwing", async () => {
    // Reproduces https://github.com/puckeditor/puck/issues/1251, where passing
    // a component that uses hooks directly as a transform threw a rules-of-hooks
    // error because the transform was called inside a useMemo.
    const EditableText = ({ value }: { value: string }) => {
      const ref = useRef<HTMLParagraphElement>(null);
      const [suffix, setSuffix] = useState("");

      useEffect(() => {
        setSuffix(" (edited)");
      }, []);

      return (
        <p ref={ref} data-testid="editable-text">
          {value}
          {suffix}
        </p>
      );
    };

    const fieldTransforms = { text: EditableText };

    render(
      <Puck
        config={config}
        data={data}
        fieldTransforms={fieldTransforms}
        iframe={{ enabled: false }}
      />
    );

    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByTestId("editable-text")).toBeInTheDocument();
    });

    // The effect ran, proving hooks work inside the transform
    await waitFor(() => {
      expect(screen.getByText("Hello (edited)")).toBeInTheDocument();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Do not call Hooks")
    );
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Invalid hook call")
    );
  });
});
