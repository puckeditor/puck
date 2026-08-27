import { render, act } from "@testing-library/react";
import { CopyHostStyles, autoFrameContext } from "../index";

/**
 * Regression cover for #1732: a host <style> that is removed and then re-added
 * identically must be mirrored into the frame again.
 *
 * `hashes` is keyed by the mirror's outerHTML (which carries
 * data-puck-style-mirror). removeEl used to key its delete by the *original*
 * node, so the real entry survived the removal and the re-added style looked
 * like a duplicate. It also left the elements entry in place, so a re-add took
 * addEl's "already mirrored" branch and wrote to a detached node.
 *
 * The mirror document here stands in for the iframe's document; CopyHostStyles
 * takes it from autoFrameContext, and `win.parent.document` in jsdom is the
 * host document the test mutates.
 */

const CSS = ".from-host { color: red; }";

// defer() in the component is setTimeout(fn, 0); the observer itself delivers
// on a microtask. Flush both.
const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mirroredCss = (doc: Document) =>
  Array.from(doc.head.querySelectorAll("style"))
    .map((el) => el.innerHTML)
    .filter((css) => css.includes("from-host"));

describe("CopyHostStyles", () => {
  let mirrorDoc: Document;
  let hostStyle: HTMLStyleElement | null;

  beforeEach(() => {
    mirrorDoc = document.implementation.createHTMLDocument("frame");
    hostStyle = null;
  });

  afterEach(() => {
    hostStyle?.remove();
  });

  const addHostStyle = async () => {
    const style = document.createElement("style");
    style.innerHTML = CSS;
    document.head.appendChild(style);
    hostStyle = style;
    await flush();
    return style;
  };

  it("re-mirrors an identical style element after it is removed and re-added", async () => {
    render(
      <autoFrameContext.Provider
        value={{ document: mirrorDoc, window: window as Window }}
      >
        <CopyHostStyles>{null}</CopyHostStyles>
      </autoFrameContext.Provider>
    );
    await flush();

    const first = await addHostStyle();
    expect(mirroredCss(mirrorDoc)).toHaveLength(1);

    first.remove();
    hostStyle = null;
    await flush();
    expect(mirroredCss(mirrorDoc)).toHaveLength(0);

    // Byte-identical to the one just removed — this is the ag-grid
    // unmount/remount case from the report, and what used to be dropped.
    await addHostStyle();
    expect(mirroredCss(mirrorDoc)).toHaveLength(1);
  });

  it("still dedupes a second, concurrently present identical style", async () => {
    render(
      <autoFrameContext.Provider
        value={{ document: mirrorDoc, window: window as Window }}
      >
        <CopyHostStyles>{null}</CopyHostStyles>
      </autoFrameContext.Provider>
    );
    await flush();

    const first = await addHostStyle();
    const second = document.createElement("style");
    second.innerHTML = CSS;
    document.head.appendChild(second);
    await flush();

    // The dedupe this fix must not break: two live identical nodes still
    // produce one mirror.
    expect(mirroredCss(mirrorDoc)).toHaveLength(1);

    first.remove();
    second.remove();
    hostStyle = null;
    await flush();
  });
});
