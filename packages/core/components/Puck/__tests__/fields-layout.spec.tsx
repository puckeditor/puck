import { act, cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReactNode } from "react";
import { Config } from "../../../types";
import { AppStoreApi } from "../../../store";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

// Styles are stubbed in tests, so expose the sidebar props as attributes
jest.mock("../components/Sidebar", () => ({
  Sidebar: ({
    position,
    isVisible,
    children,
  }: {
    position: string;
    isVisible: boolean;
    children: ReactNode;
  }) => (
    <div data-sidebar={position} data-visible={isVisible}>
      {children}
    </div>
  ),
}));

let viewport: "mobile" | "desktop" = "desktop";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: viewport === "desktop",
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

const getAppStore = () =>
  (window as any).__PUCK_INTERNAL_DO_NOT_USE.appStore as AppStoreApi;

const resizeTo = async (to: "mobile" | "desktop") => {
  viewport = to;

  act(() => {
    window.dispatchEvent(new Event("resize"));
  });

  await flush();
};

const queryFields = (container: HTMLElement, name = "title") => ({
  all: container.querySelectorAll(`input[name="${name}"]`),
  left: container.querySelectorAll(
    `[data-sidebar="left"][data-visible="true"] input[name="${name}"]`
  ),
  right: container.querySelectorAll(
    `[data-sidebar="right"][data-visible="true"] input[name="${name}"]`
  ),
});

const config: Config = {
  root: { fields: { title: { type: "text" } } },
  components: {},
};

afterEach(() => cleanup());

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("fields layout", () => {
  it("renders the fields once, in the right sidebar on desktop", async () => {
    viewport = "desktop";

    const { container } = render(
      <Puck config={config} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(queryFields(container).all).toHaveLength(1);
    expect(queryFields(container).right).toHaveLength(1);
  });

  it("renders the fields once, in the fields plugin on mobile", async () => {
    viewport = "mobile";

    const { container } = render(
      <Puck config={config} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    act(() => {
      getAppStore()
        .getState()
        .setUi({
          plugin: { current: "fields" },
          leftSideBarVisible: true,
        });
    });

    expect(queryFields(container).all).toHaveLength(1);
    expect(queryFields(container).left).toHaveLength(1);
  });

  it("keeps the fields in the right sidebar when the fields plugin is selected on desktop", async () => {
    viewport = "desktop";

    // Reachable through the `ui` prop, or when undo/redo restores a selection
    // that was made on mobile
    const { container } = render(
      <Puck
        config={config}
        data={{}}
        iframe={{ enabled: false }}
        ui={{ plugin: { current: "fields" } }}
      />
    );

    await flush();

    expect(queryFields(container).all).toHaveLength(1);
    expect(queryFields(container).right).toHaveLength(1);

    // The right sidebar still follows its own visibility
    act(() => {
      getAppStore().getState().setUi({ rightSideBarVisible: false });
    });

    expect(queryFields(container).all).toHaveLength(1);
    expect(queryFields(container).right).toHaveLength(0);

    act(() => {
      getAppStore().getState().setUi({ rightSideBarVisible: true });
    });

    expect(queryFields(container).right).toHaveLength(1);
  });

  it("keeps the fields open when resizing from mobile to desktop", async () => {
    viewport = "mobile";

    const { container } = render(
      <Puck config={config} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    act(() => {
      getAppStore()
        .getState()
        .setUi({
          plugin: { current: "fields" },
          leftSideBarVisible: true,
        });
    });

    expect(queryFields(container).left).toHaveLength(1);

    await resizeTo("desktop");

    expect(queryFields(container).all).toHaveLength(1);
    expect(queryFields(container).right).toHaveLength(1);
  });

  it("keeps the resolved fields when they move between the sidebars", async () => {
    // The documented pattern: only resolve again when the data changed
    const resolveFields = (_data: any, { changed, lastFields }: any) => {
      if (!changed.fieldType) return lastFields;

      return { ...lastFields, dynamic: { type: "text" } };
    };

    viewport = "mobile";

    const { container } = render(
      <Puck
        config={{
          components: {
            Heading: {
              fields: { fieldType: { type: "text" } },
              resolveFields: resolveFields as any,
              render: () => <div />,
            },
          },
        }}
        data={{
          content: [
            { type: "Heading", props: { id: "heading-1", fieldType: "text" } },
          ],
        }}
        ui={{ itemSelector: { index: 0, zone: "root:default-zone" } }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    expect(queryFields(container, "dynamic").all).toHaveLength(1);

    await resizeTo("desktop");

    expect(queryFields(container, "dynamic").all).toHaveLength(1);

    await resizeTo("mobile");

    expect(queryFields(container, "dynamic").all).toHaveLength(1);
  });
});
