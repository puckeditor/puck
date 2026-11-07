import type { DragDropManager } from "@dnd-kit/dom";

import {
  findDeepestCandidate,
  getPointerTargetElement,
} from "../NestedDroppablePlugin";
import { GlobalPosition } from "../../global-position";
import { rootAreaId, rootDroppableId } from "../../root-droppable-id";

const createFrameDocument = () => {
  const iframe = document.createElement("iframe");
  iframe.id = "preview-frame";
  document.body.appendChild(iframe);

  return iframe.contentDocument!;
};

describe("getPointerTargetElement", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns element targets unchanged", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    expect(getPointerTargetElement(element)).toBe(element);
  });

  it("returns null when there is no target", () => {
    expect(getPointerTargetElement(null)).toBeNull();
  });

  it("returns the root element when the target is the iframe document", () => {
    // Firefox targets pointer events at the iframe document while dragging
    // outside the canvas, and a Document has no ownerDocument
    const frameDocument = createFrameDocument();

    expect(frameDocument.ownerDocument).toBeNull();

    const target = getPointerTargetElement(frameDocument);

    expect(target).toBe(frameDocument.documentElement);
    expect(target?.ownerDocument).toBe(frameDocument);
  });

  it("returns the root element when the target is the host document", () => {
    expect(getPointerTargetElement(document)).toBe(document.documentElement);
  });

  it("finds a candidate without throwing for a document target", () => {
    const frameDocument = createFrameDocument();
    const elementsFromPoint = jest.fn(() => [] as Element[]);
    frameDocument.elementsFromPoint = elementsFromPoint;

    const manager = {
      registry: { droppables: new Map() },
      dragOperation: { source: null },
    } as unknown as DragDropManager;

    const position = new GlobalPosition(
      getPointerTargetElement(frameDocument)!,
      { x: -20, y: 40 }
    );

    expect(findDeepestCandidate(position, manager)).toEqual({
      zone: rootDroppableId,
      area: rootAreaId,
    });
    expect(elementsFromPoint).toHaveBeenCalledWith(-20, 40);
  });
});
