import containsDataAttr from "../node-contains-data-attr";

const attr = "data-puck-tab-marker";

const marker = (doc: Document = document) => {
  const el = doc.createElement("span");
  el.setAttribute(attr, "");

  return el;
};

describe("containsDataAttr", () => {
  it("finds the attribute on the element or a descendant", () => {
    const parent = document.createElement("div");
    const child = marker();
    parent.appendChild(child);

    expect(containsDataAttr(child, attr)).toBe(true);
    expect(containsDataAttr(parent, attr)).toBe(true);
    expect(containsDataAttr(document.createElement("div"), attr)).toBe(false);
  });

  it("ignores nodes that aren't elements", () => {
    expect(containsDataAttr(document.createTextNode("text"), attr)).toBe(false);
  });

  it("finds the attribute on elements from another document, like an iframe's", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    const iframeMarker = marker(iframe.contentDocument!);

    expect(containsDataAttr(iframeMarker, attr)).toBe(true);

    iframe.remove();
  });
});
