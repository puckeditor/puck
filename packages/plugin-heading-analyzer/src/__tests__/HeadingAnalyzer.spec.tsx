import { act, cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";

let mockData = { content: [] as any[], root: {} };
const mockListeners = new Set<() => void>();

const setMockData = (data: typeof mockData) => {
  mockData = data;
  mockListeners.forEach((listener) => listener());
};

jest.mock("@puckeditor/core", () => {
  const { useSyncExternalStore } = jest.requireActual("react");

  return {
    createUsePuck:
      () =>
      (selector: (s: { appState: { data: typeof mockData } }) => unknown) =>
        useSyncExternalStore(
          (listener: () => void) => {
            mockListeners.add(listener);
            return () => mockListeners.delete(listener);
          },
          () => selector({ appState: { data: mockData } })
        ),
  };
});

import { HeadingAnalyzer } from "../HeadingAnalyzer";

// Track live observers so we can assert nothing leaks or duplicates
const NativeMutationObserver = global.MutationObserver;
let activeObservers = new Set<MutationObserver>();

class TrackedMutationObserver extends NativeMutationObserver {
  observe(target: Node, options?: MutationObserverInit) {
    activeObservers.add(this);
    super.observe(target, options);
  }

  disconnect() {
    activeObservers.delete(this);
    super.disconnect();
  }
}

const createFrameDocument = (entryHtml?: string) => {
  const doc = document.implementation.createHTMLDocument();

  if (typeof entryHtml !== "undefined") {
    doc.body.innerHTML = `<div id="frame-root" data-puck-entry>${entryHtml}</div>`;
  }

  return doc;
};

// jsdom doesn't load srcDoc, so we control the iframe document directly
const createIframe = (doc: Document) => {
  const iframe = document.createElement("iframe");
  iframe.id = "preview-frame";

  let currentDoc = doc;

  Object.defineProperty(iframe, "contentDocument", {
    configurable: true,
    get: () => currentDoc,
  });

  document.body.appendChild(iframe);

  return {
    iframe,
    load: (nextDoc: Document) => {
      currentDoc = nextDoc;
      iframe.dispatchEvent(new Event("load"));
    },
  };
};

const getOutline = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("small"))
    .map((el) => el.textContent)
    .filter((text) => /^H\d/.test(text || ""));

const flush = () => act(async () => {});

describe("HeadingAnalyzer", () => {
  beforeEach(() => {
    activeObservers = new Set();
    global.MutationObserver = TrackedMutationObserver;
    mockData = { content: [], root: {} };
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    global.MutationObserver = NativeMutationObserver;
  });

  it("shows headings once the iframe replaces its initial document", async () => {
    // Before srcDoc loads, the iframe exposes a blank document
    const { load } = createIframe(createFrameDocument());

    const { container } = render(<HeadingAnalyzer />);

    expect(container.textContent).toContain("No headings.");

    const loadedDoc = createFrameDocument("");
    await act(async () => load(loadedDoc));

    // Portal renders into the entry after load
    await act(async () => {
      loadedDoc.getElementById("frame-root")!.innerHTML =
        "<h1>Title</h1><h2>Subtitle</h2>";
    });

    expect(getOutline(container)).toEqual(["H1: Title", "H2: Subtitle"]);
  });

  it("shows headings already rendered when the frame is first read", () => {
    createIframe(createFrameDocument("<h1>Title</h1><h2>Subtitle</h2>"));

    const { container } = render(<HeadingAnalyzer />);

    expect(getOutline(container)).toEqual(["H1: Title", "H2: Subtitle"]);
  });

  it("scans an entry that appears already populated", async () => {
    const doc = createFrameDocument();
    createIframe(doc);

    const { container } = render(<HeadingAnalyzer />);

    expect(getOutline(container)).toEqual([]);

    await act(async () => {
      doc.body.innerHTML =
        "<div data-puck-entry><h1>Title</h1><h2>Subtitle</h2></div>";
    });

    expect(getOutline(container)).toEqual(["H1: Title", "H2: Subtitle"]);
  });

  it("follows a replaced iframe and ignores the old document", async () => {
    const oldDoc = createFrameDocument("<h1>Old</h1>");
    const { iframe } = createIframe(oldDoc);

    const { container } = render(<HeadingAnalyzer />);

    expect(getOutline(container)).toEqual(["H1: Old"]);

    iframe.remove();

    await act(async () => {
      const { load } = createIframe(createFrameDocument());
      load(createFrameDocument("<h1>New</h1>"));
    });

    expect(getOutline(container)).toEqual(["H1: New"]);

    await act(async () => {
      oldDoc.getElementById("frame-root")!.innerHTML = "<h1>Stale</h1>";
    });

    expect(getOutline(container)).toEqual(["H1: New"]);
  });

  it("updates when data changes", async () => {
    const doc = createFrameDocument("<h1>Title</h1>");
    createIframe(doc);

    const { container } = render(<HeadingAnalyzer />);

    await act(async () => {
      doc.querySelector("h1")!.textContent = "Edited";
      setMockData({ content: [], root: {} });
    });

    expect(getOutline(container)).toEqual(["H1: Edited"]);
  });

  it("updates when heading text changes without a data change", async () => {
    const doc = createFrameDocument("<h1>Title</h1>");
    createIframe(doc);

    const { container } = render(<HeadingAnalyzer />);

    await act(async () => {
      (doc.querySelector("h1")!.firstChild as Text).data = "Typed";
    });

    expect(getOutline(container)).toEqual(["H1: Typed"]);
  });

  it("shows headings when the preview isn't in an iframe", () => {
    document.body.innerHTML =
      '<div id="preview-frame"><div data-puck-entry><h1>Title</h1><h3>Deep</h3></div></div>';

    const { container } = render(<HeadingAnalyzer />);

    expect(getOutline(container)).toEqual([
      "H1: Title",
      "H2: Missing",
      "H3: Deep",
    ]);
  });

  it("excludes headings that are being dragged", () => {
    createIframe(
      createFrameDocument(
        "<h1>Title</h1><div data-dnd-dragging><h2>Dragged</h2></div>"
      )
    );

    const { container } = render(<HeadingAnalyzer />);

    expect(getOutline(container)).toEqual(["H1: Title"]);
  });

  it("doesn't leak observers or listeners in Strict Mode", async () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const addSpy = jest.spyOn(document, "addEventListener");

    const { load } = createIframe(createFrameDocument());

    const { container, unmount } = render(
      <StrictMode>
        <HeadingAnalyzer />
      </StrictMode>
    );

    expect(activeObservers.size).toBe(1);

    await act(async () => load(createFrameDocument("<h1>Title</h1>")));

    expect(getOutline(container)).toEqual(["H1: Title"]);
    expect(activeObservers.size).toBe(1);

    unmount();
    await flush();

    expect(activeObservers.size).toBe(0);

    const loadCalls = (spy: jest.SpyInstance) =>
      spy.mock.calls.filter(([type]) => type === "load").map(([, fn]) => fn);

    expect(loadCalls(removeSpy)).toEqual(loadCalls(addSpy));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
