// Shared jsdom environment + browser-API stubs for the Vue bridge smoke tests.
// Puck's editor uses APIs jsdom lacks or implements strictly (localStorage,
// ResizeObserver, matchMedia, dnd-kit's addEventListener({signal})); these
// stubs let the whole editor mount headlessly. In a real browser none are
// needed. Call setupDom() once before requiring the built bundle.
const { JSDOM } = require("jsdom");

function setupDom() {
  const dom = new JSDOM(
    "<!DOCTYPE html><html><head></head><body></body></html>",
    { url: "http://localhost/", pretendToBeVisual: true }
  );
  const w = dom.window;

  const globals = [
    "window", "document", "navigator", "HTMLElement", "Node", "Element",
    "Event", "CustomEvent", "MutationObserver", "DocumentFragment", "Text",
    "Comment", "SVGElement", "HTMLInputElement", "HTMLDivElement",
    "HTMLTemplateElement", "HTMLIFrameElement", "DOMParser", "XMLSerializer",
    "DOMRect", "getSelection",
  ];
  for (const k of globals) if (w[k] !== undefined) global[k] = w[k];

  global.getComputedStyle = w.getComputedStyle.bind(w);
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  global.ResizeObserver = w.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  global.IntersectionObserver = w.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
  w.matchMedia = global.matchMedia = (q) => ({
    matches: false, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
  if (!w.HTMLElement.prototype.scrollIntoView) {
    w.HTMLElement.prototype.scrollIntoView = () => {};
  }

  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  global.localStorage = w.localStorage = localStorage;

  // dnd-kit binds listeners with { signal }; make jsdom accept them.
  if (w.AbortController) {
    global.AbortController = w.AbortController;
    global.AbortSignal = w.AbortSignal;
  } else {
    const add = w.EventTarget.prototype.addEventListener;
    w.EventTarget.prototype.addEventListener = function (t, l, o) {
      if (o && typeof o === "object" && "signal" in o) {
        const { signal, ...rest } = o;
        return add.call(this, t, l, rest);
      }
      return add.call(this, t, l, o);
    };
  }

  return dom;
}

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

module.exports = { setupDom, tick };
