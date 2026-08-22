import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config, Data, Overrides } from "../../../types";

jest.mock("../../Puck/styles.module.css");

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

import { Puck } from "../../Puck";
import { AutoField } from "..";

const flush = () => act(async () => {});

type RootProps = { title?: string; subtitle?: string };

const config: Config<{ components: {}; root: RootProps }> = {
  root: { fields: { title: { type: "text" } } },
  components: {},
};

const data: Data<{}, RootProps> = {
  root: { props: { title: "Hello, world" } },
  content: [],
};

const renderPuck = (
  overrides: Partial<Overrides>,
  cfg: typeof config = config,
  d: typeof data = data
) =>
  render(
    <Puck
      config={cfg}
      data={d}
      overrides={overrides}
      iframe={{ enabled: false }}
    />
  );

/**
 * Puck mounts its fields panel more than once (the sidebar and the mobile
 * layout render the same fields), so a single field renders a fixed multiple of
 * times. Measure it rather than hardcoding it, or these tests break the next
 * time the shell changes.
 */
let panels = 0;

beforeAll(async () => {
  const spy = jest.fn();

  renderPuck({
    fieldTypes: {
      text: () => {
        spy();

        return <strong>Measured</strong>;
      },
    },
  });

  await flush();
  await waitFor(() => expect(spy).toHaveBeenCalled());

  panels = spy.mock.calls.length;

  cleanup();
});

describe("fieldTypes overrides that render <AutoField>", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the built-in field rather than re-entering the override", async () => {
    const renderSpy = jest.fn();

    renderPuck({
      fieldTypes: {
        text: (props) => {
          renderSpy();

          return (
            <>
              <strong>Text Field</strong>
              <AutoField
                value={props.value}
                onChange={props.onChange}
                field={{ type: "text" }}
              />
            </>
          );
        },
      },
    });

    await flush();
    await waitFor(() => expect(renderSpy).toHaveBeenCalled());

    // The override wraps its field exactly once. Before this was fixed, the
    // nested <AutoField> resolved the same override again, and again, until the
    // stack was exhausted.
    expect(renderSpy).toHaveBeenCalledTimes(panels);
    expect(screen.getAllByText("Text Field")).toHaveLength(panels);

    // ...and the field it renders is the built-in one, carrying the value.
    expect(screen.getAllByDisplayValue("Hello, world")).toHaveLength(panels);
  });

  it("doesn't re-enter a mutually recursive pair of overrides", async () => {
    const textSpy = jest.fn();
    const numberSpy = jest.fn();

    renderPuck({
      fieldTypes: {
        text: (props) => {
          textSpy();

          return (
            <>
              <strong>Text Field</strong>
              <AutoField
                value={props.value}
                onChange={props.onChange}
                field={{ type: "number" }}
              />
            </>
          );
        },
        number: (props) => {
          numberSpy();

          return (
            <>
              <strong>Number Field</strong>
              <AutoField
                value={props.value}
                onChange={props.onChange}
                field={{ type: "text" }}
              />
            </>
          );
        },
      },
    });

    await flush();
    await waitFor(() => expect(numberSpy).toHaveBeenCalled());

    // text -> number is entered, and the text field nested inside number falls
    // back to the built-in field instead of starting the cycle again.
    expect(textSpy).toHaveBeenCalledTimes(panels);
    expect(numberSpy).toHaveBeenCalledTimes(panels);
  });

  it("still applies an override to a different field type nested within one", async () => {
    const numberSpy = jest.fn();

    renderPuck({
      fieldTypes: {
        text: (props) => (
          <>
            <strong>Text Field</strong>
            <AutoField
              value={props.value}
              onChange={props.onChange}
              field={{ type: "number" }}
            />
          </>
        ),
        number: () => {
          numberSpy();

          return <strong>Number Field</strong>;
        },
      },
    });

    await flush();
    await waitFor(() => expect(numberSpy).toHaveBeenCalled());

    expect(numberSpy).toHaveBeenCalledTimes(panels);
  });

  it("leaves the override in place for fields outside its own subtree", async () => {
    const textSpy = jest.fn();

    renderPuck(
      {
        fieldTypes: {
          text: (props) => {
            textSpy();

            return (
              <>
                <strong>Text Field</strong>
                <AutoField
                  value={props.value}
                  onChange={props.onChange}
                  field={{ type: "text" }}
                />
              </>
            );
          },
        },
      },
      {
        root: {
          fields: { title: { type: "text" }, subtitle: { type: "text" } },
        },
        components: {},
      },
      { root: { props: { title: "a", subtitle: "b" } }, content: [] }
    );

    await flush();
    await waitFor(() => expect(textSpy).toHaveBeenCalled());

    // Two sibling text fields, each overridden once: the fallback is scoped to
    // an override's own subtree, not to the field type globally.
    expect(textSpy).toHaveBeenCalledTimes(panels * 2);
    expect(screen.getAllByText("Text Field")).toHaveLength(panels * 2);
  });
});
