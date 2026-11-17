import { shouldBlockDeleteHotkey } from "../use-delete-hotkeys";

// Dispatch a Backspace keydown from `el` and return the guard's verdict,
// read during dispatch the same way the hotkey listener sees it.
const backspaceFrom = (el: Element) => {
  const doc = el.ownerDocument;
  const win = doc.defaultView!;
  let blocked: boolean | undefined;

  const listener = (e: KeyboardEvent) => {
    blocked = shouldBlockDeleteHotkey(e);
  };

  doc.addEventListener("keydown", listener);
  el.dispatchEvent(
    new win.KeyboardEvent("keydown", { code: "Backspace", bubbles: true })
  );
  doc.removeEventListener("keydown", listener);

  return blocked;
};

describe("shouldBlockDeleteHotkey", () => {
  let iframe: HTMLIFrameElement;
  let frameDoc: Document;

  beforeEach(() => {
    iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    frameDoc = iframe.contentDocument!;
  });

  afterEach(() => {
    iframe.remove();
    document.body.innerHTML = "";
  });

  it("blocks when typing in an input in the host document", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    expect(backspaceFrom(input)).toBe(true);
  });

  it("blocks when typing in an input inside the iframe", () => {
    const input = frameDoc.createElement("input");
    frameDoc.body.appendChild(input);

    expect(input instanceof HTMLElement).toBe(false);
    expect(backspaceFrom(input)).toBe(true);
  });

  it("blocks when typing in a textarea inside the iframe", () => {
    const textarea = frameDoc.createElement("textarea");
    frameDoc.body.appendChild(textarea);

    expect(backspaceFrom(textarea)).toBe(true);
  });

  it("blocks when typing in a textbox role inside the iframe", () => {
    const textbox = frameDoc.createElement("div");
    textbox.setAttribute("role", "textbox");
    frameDoc.body.appendChild(textbox);

    expect(backspaceFrom(textbox)).toBe(true);
  });

  it("does not block for a non-editable element inside the iframe", () => {
    const div = frameDoc.createElement("div");
    frameDoc.body.appendChild(div);

    expect(backspaceFrom(div)).toBe(false);
  });
});
