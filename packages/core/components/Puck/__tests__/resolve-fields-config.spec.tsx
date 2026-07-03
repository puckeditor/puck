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

describe("resolved fields react to config changes", () => {
  it("re-resolves resolveFields output when swapping back to the original config object", async () => {
    // Mirrors config-level localization: a stable module-level config for the
    // default language, and a translated copy created per swap. Swapping BACK
    // reuses the original object identity — this used to get stuck.
    const rootFields: any = {
      myText: { type: "text" },
      items: { type: "array", arrayFields: { url: { type: "text" } } },
    };

    const baseConfig: Config = {
      root: {
        fields: rootFields,
        // withLayout-style resolver: closure over the ORIGINAL fields
        resolveFields: (() => ({ ...rootFields })) as any,
        render: ({ children }: any) => <div>Root{children}</div>,
      },
      components: {},
    };

    const translations: Record<string, string> = {
      myText: "Texto",
      items: "Elementos",
    };

    const translateConfig = (base: Config): Config => {
      const translate = (fields: Record<string, any>) =>
        Object.fromEntries(
          Object.entries(fields).map(([key, field]) => [
            key,
            translations[key] ? { ...field, label: translations[key] } : field,
          ])
        );

      const original = (base.root as any).resolveFields;

      return {
        ...base,
        root: {
          ...base.root,
          fields: translate((base.root as any).fields),
          resolveFields: (async (data: any, params: any) =>
            translate(await original(data, params))) as any,
        } as any,
      };
    };

    const { rerender } = render(
      <Puck config={baseConfig} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(screen.getAllByText("myText").length).toBeGreaterThan(0);

    rerender(
      <Puck
        config={translateConfig(baseConfig)}
        data={{}}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    expect(screen.getAllByText("Texto").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("myText")).toHaveLength(0);

    // Swap BACK — same module object identity as at mount
    rerender(
      <Puck config={baseConfig} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(screen.getAllByText("myText").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Texto")).toHaveLength(0);
  });

  it("discards a stale resolveFields run that completes after a config swap", async () => {
    // The race: a resolveFields run starts under config A, the config swaps to
    // B and re-resolves, then A's slow async resolver completes LAST. Its
    // result must be discarded — otherwise it clobbers B's fields.
    const releaseStale: Array<() => void> = [];

    const staleConfig: Config = {
      root: {
        fields: { myText: { type: "text", label: "Texto" } },
        resolveFields: (async (_: any, { fields }: any) => {
          // Held open until the test releases it
          await new Promise<void>((resolve) => releaseStale.push(resolve));
          return fields;
        }) as any,
        render: ({ children }: any) => <div>Root{children}</div>,
      },
      components: {},
    };

    const freshConfig: Config = {
      root: {
        fields: { myText: { type: "text", label: "Title" } },
        resolveFields: (async (_: any, { fields }: any) => fields) as any,
        render: ({ children }: any) => <div>Root{children}</div>,
      },
      components: {},
    };

    const { rerender } = render(
      <Puck config={staleConfig} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    // The sync reset already shows the stale config's default label, while its
    // async resolver is still in flight (gated).
    expect(screen.getAllByText("Texto").length).toBeGreaterThan(0);
    expect(releaseStale.length).toBeGreaterThan(0);

    // Swap config while the stale resolver is still pending
    rerender(
      <Puck config={freshConfig} data={{}} iframe={{ enabled: false }} />
    );

    await flush();

    expect(screen.getAllByText("Title").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Texto")).toHaveLength(0);

    // Now let the STALE run complete — it must not clobber the fresh fields
    await act(async () => {
      releaseStale.forEach((release) => release());
    });

    await flush();

    expect(screen.getAllByText("Title").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Texto")).toHaveLength(0);
  });
});
