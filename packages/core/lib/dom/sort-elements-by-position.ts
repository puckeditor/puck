/**
 * Sort an array of objects with elements by their position in the DOM.
 *
 * @param elements The array of objects with elements to sort.
 * @param getElement A function that returns the DOM element from one of the objects in the array.
 * @returns A new array of objects sorted by their position in the DOM.
 */
const sortElementsByPosition = <ObjectWithElement>(
  elements: ObjectWithElement[],
  getElement: (obj: ObjectWithElement) => HTMLElement
) =>
  [...elements].sort((a, b) =>
    getElement(a).compareDocumentPosition(getElement(b)) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1
  );

export default sortElementsByPosition;
