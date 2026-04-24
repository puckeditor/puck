import { act, cleanup, render, screen } from "@testing-library/react";
import { Config } from "../../../types";
import "@testing-library/jest-dom";
import {
  PUCK_STYLE_ID_ATTRIBUTE,
  PUCK_STYLE_IDS,
  PUCK_STYLE_SOURCE_ATTRIBUTE,
  PUCK_STYLE_SOURCE_VALUE,
  useInjectIframeCss,
} from "../../../lib/use-inject-css";
import { shouldMirrorStyleElement, syncAttributes } from "../../AutoFrame";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false, // default → desktop
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // ⬅️ legacy APIs some libs still call
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
    // Provider becomes a no-op wrapper
    DragDropProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),

    // Hooks return dummy objects so destructuring works
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

type PuckInternal = {
  appStore: AppStoreApi;
};

const getInternal = () => {
  return (window as any).__PUCK_INTERNAL_DO_NOT_USE as PuckInternal;
};

import { Puck } from "../index";
import { AppStoreApi } from "../../../store";

describe("Puck", () => {
  const componentARender = jest.fn(() => null);
  const componentBRender = jest.fn(() => null);
  const rootRender = jest.fn(() => null);

  const config: Config = {
    root: {
      render: ({ children }) => {
        rootRender();
        return <div>Root{children}</div>;
      },
    },
    components: {
      componentA: {
        render: () => {
          componentARender();
          return <div>Component A</div>;
        },
      },
      componentB: {
        render: () => {
          componentBRender();
          return <div>Component A</div>;
        },
      },
    },
  };

  afterEach(() => {
    cleanup();
    rootRender.mockClear();
    componentARender.mockClear();
    componentBRender.mockClear();
    document
      .querySelectorAll(
        `[${PUCK_STYLE_SOURCE_ATTRIBUTE}="${PUCK_STYLE_SOURCE_VALUE}"]`
      )
      .forEach((el) => el.remove());
    document.querySelectorAll("[data-test-style]").forEach((el) => el.remove());
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("class");
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  // flush any queued state updates
  const flush = () => act(async () => {});

  it("root renders", async () => {
    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    expect(rootRender).toHaveBeenCalled();
    expect(screen.getByText("Root")).toBeInTheDocument();
  });

  it("should generate the correct state on mount", async () => {
    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    const { appStore } = getInternal();

    expect(appStore.getState()).toMatchSnapshot();
  });

  it("should index slots on mount", async () => {
    render(
      <Puck
        config={{
          root: {
            fields: {
              content: { type: "slot" },
            },
          },
          components: {},
        }}
        data={{
          root: {
            props: {
              content: [],
            },
          },
        }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    const { appStore } = getInternal();

    expect(appStore.getState().state.indexes).toMatchInlineSnapshot(`
      {
        "nodes": {
          "root": {
            "data": {
              "props": {
                "content": [],
                "id": "root",
              },
              "type": "root",
            },
            "flatData": {
              "props": {
                "content": null,
                "id": "root",
              },
              "type": "root",
            },
            "parentId": null,
            "path": [],
            "zone": "",
          },
        },
        "zones": {
          "root:content": {
            "contentIds": [],
            "type": "slot",
          },
          "root:default-zone": {
            "contentIds": [],
            "type": "root",
          },
        },
      }
    `);
  });

  it("injects the default ui styles once per document", async () => {
    const { unmount } = render(
      <>
        <Puck config={config} data={{}} iframe={{ enabled: false }} />
        <Puck config={config} data={{}} iframe={{ enabled: false }} />
      </>
    );

    await flush();

    expect(
      document.head.querySelectorAll(
        `[${PUCK_STYLE_ID_ATTRIBUTE}="${PUCK_STYLE_IDS.uiDefault}"]`
      )
    ).toHaveLength(1);

    unmount();
    await flush();

    expect(
      document.head.querySelectorAll(
        `[${PUCK_STYLE_ID_ATTRIBUTE}="${PUCK_STYLE_IDS.uiDefault}"]`
      )
    ).toHaveLength(0);
  });

  it("marks puck-owned styles as non-mirrorable", () => {
    const hostStyle = document.createElement("style");
    hostStyle.textContent = ".external-sync-target { background: tomato; }";

    const puckStyle = document.createElement("style");
    puckStyle.textContent = ".puck-ui { color: black; }";
    puckStyle.setAttribute(
      PUCK_STYLE_SOURCE_ATTRIBUTE,
      PUCK_STYLE_SOURCE_VALUE
    );

    expect(shouldMirrorStyleElement(hostStyle)).toBe(true);
    expect(shouldMirrorStyleElement(puckStyle)).toBe(false);
  });

  it("injects iframe interaction styles into a target document", async () => {
    const targetDocument = document.implementation.createHTMLDocument("iframe");

    const InjectIframeStyles = () => {
      useInjectIframeCss(targetDocument);

      return null;
    };

    render(<InjectIframeStyles />);
    await flush();

    const interactionStyle = targetDocument.head.querySelector(
      `[${PUCK_STYLE_ID_ATTRIBUTE}="${PUCK_STYLE_IDS.iframeInteractions}"]`
    );

    expect(interactionStyle).not.toBeNull();
    expect(interactionStyle?.getAttribute(PUCK_STYLE_SOURCE_ATTRIBUTE)).toBe(
      PUCK_STYLE_SOURCE_VALUE
    );
  });

  it("syncs and restores html/body attributes", () => {
    const sourceDocument = document.implementation.createHTMLDocument("source");
    const targetDocument = document.implementation.createHTMLDocument("target");

    sourceDocument.documentElement.setAttribute("data-theme", "host");
    sourceDocument.body.setAttribute("class", "host-body");
    targetDocument.documentElement.setAttribute("lang", "en");
    targetDocument.body.setAttribute("data-existing", "true");

    const restoreHtml = syncAttributes(
      sourceDocument.documentElement,
      targetDocument.documentElement
    );
    const restoreBody = syncAttributes(
      sourceDocument.body,
      targetDocument.body
    );

    expect(targetDocument.documentElement.getAttribute("data-theme")).toBe(
      "host"
    );
    expect(targetDocument.documentElement.getAttribute("lang")).toBeNull();
    expect(targetDocument.body.getAttribute("class")).toBe("host-body");
    expect(targetDocument.body.getAttribute("data-existing")).toBeNull();

    restoreHtml();
    restoreBody();

    expect(
      targetDocument.documentElement.getAttribute("data-theme")
    ).toBeNull();
    expect(targetDocument.documentElement.getAttribute("lang")).toBe("en");
    expect(targetDocument.body.getAttribute("class")).toBeNull();
    expect(targetDocument.body.getAttribute("data-existing")).toBe("true");
  });
});
