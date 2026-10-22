const isBefore = (a: HTMLElement, b: HTMLElement) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

/**
 * Sort an array of objects with elements by their position in the DOM.
 *
 * @param elements The array of objects with elements to sort.
 * @param getElement A function that returns the DOM element from one of the objects in the array.
 * @returns A new array of objects sorted by their position in the DOM if they are not already sorted, otherwise the original array.
 */
const sortElementsByPosition = <ObjectWithElement>(
  elements: ObjectWithElement[],
  getElement: (obj: ObjectWithElement) => HTMLElement
) => {
  const isSorted = elements.every(
    (item, i) =>
      i === 0 || isBefore(getElement(elements[i - 1]), getElement(item))
  );

  if (isSorted) return elements;

  return [...elements].sort((a, b) =>
    isBefore(getElement(a), getElement(b)) ? -1 : 1
  );
};

export default sortElementsByPosition;
