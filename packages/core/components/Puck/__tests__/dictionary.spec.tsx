import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

// Default to desktop so the header (and its Publish button) renders.
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

const config: Config = {
  components: {},
};

// Flush any queued state updates.
const flush = () => act(async () => {});

afterEach(() => cleanup());

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("Puck dictionary prop", () => {
  it("renders the default messages when no dictionary is provided", async () => {
    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    // "Publish" appears in both the header and the menu bar.
    expect(screen.getAllByText("Publish").length).toBeGreaterThan(0);
  });

  it("overrides a provided key and falls back for unprovided keys", async () => {
    render(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{ "header-publish": "Publicar" }}
      />
    );

    await flush();

    // The provided key is overridden...
    expect(screen.getAllByText("Publicar").length).toBeGreaterThan(0);
    expect(screen.queryByText("Publish")).not.toBeInTheDocument();

    // ...and an unprovided key still shows its default.
    expect(screen.getByTitle("Toggle left sidebar")).toBeInTheDocument();
  });

  it("reacts to a changed dictionary prop", async () => {
    const { rerender } = render(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{ "header-publish": "Publicar" }}
      />
    );

    await flush();

    expect(screen.getAllByText("Publicar").length).toBeGreaterThan(0);

    rerender(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{ "header-publish": "Veröffentlichen" }}
      />
    );

    await flush();

    expect(screen.getAllByText("Veröffentlichen").length).toBeGreaterThan(0);
    expect(screen.queryByText("Publicar")).not.toBeInTheDocument();
  });

  it("honors an explicit empty string instead of falling back (?? not falsy)", async () => {
    const { rerender } = render(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{ "header-publish": "" }}
      />
    );

    await flush();

    // The empty string is used, so the default text is NOT rendered...
    expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    // ...but the rest of the chrome still renders (an unprovided default key).
    expect(screen.getByTitle("Toggle left sidebar")).toBeInTheDocument();

    // An omitted/undefined key falls back to the default.
    rerender(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{}}
      />
    );

    await flush();

    expect(screen.getAllByText("Publish").length).toBeGreaterThan(0);
  });

  it("re-resolves field labels when the config prop changes, in both directions", async () => {
    // Simulates config-level localization (e.g. the demo's translateConfig):
    // the same config shape with different field labels per language.
    const makeConfig = (labels: { title: string; links: string }): Config => ({
      root: {
        render: ({ children }: any) => <div>Root{children}</div>,
        fields: {
          title: { type: "text", label: labels.title },
          links: {
            type: "array",
            label: labels.links,
            arrayFields: { url: { type: "text" } },
          },
        },
      },
      components: {},
    });

    const en = { title: "Title", links: "Links" };
    const es = { title: "Título", links: "Enlaces" };

    const { rerender } = render(
      <Puck config={makeConfig(en)} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    // The fields panel renders in both the desktop sidebar and the mobile
    // fields tab, so labels can legitimately appear more than once.
    expect(screen.getAllByText("Title").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Links").length).toBeGreaterThan(0);

    rerender(
      <Puck config={makeConfig(es)} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(screen.getAllByText("Título").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enlaces").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Title")).toHaveLength(0);

    // Swapping BACK must also update — this used to get stuck because the
    // fields slice cached the resolved fields and never watched the config.
    rerender(
      <Puck config={makeConfig(en)} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(screen.getAllByText("Title").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Links").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Título")).toHaveLength(0);
  });

  it("interpolates {placeholder} tokens in messages", async () => {
    // The component-list category accordion title is "Collapse {title}".
    const categoryConfig: Config = {
      components: { Heading: { render: () => <div>Heading</div> } },
      categories: {
        typography: { title: "Typography", components: ["Heading"] },
      },
    };

    const { rerender } = render(
      <Puck config={categoryConfig} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    // Default template "Collapse {title}" interpolated with the category title.
    expect(screen.getByTitle("Collapse Typography")).toBeInTheDocument();

    // An override keeps interpolating the {title} token.
    rerender(
      <Puck
        config={categoryConfig}
        data={{}}
        iframe={{ enabled: false }}
        dictionary={{ "drawer-category-collapse": "Cerrar {title}" }}
      />
    );

    await flush();

    expect(screen.getByTitle("Cerrar Typography")).toBeInTheDocument();
  });
});
