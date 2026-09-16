/**
 * Returns true if the given element is fixed or inside a fixed element.
 *
 * @param element The element to check.
 * @returns True if the element is fixed or inside a fixed element, false otherwise.
 */
const isFixed = (element: Element | null): boolean => {
  let currElement: Element | null = element;

  while (currElement && currElement !== document.documentElement) {
    if (getComputedStyle(currElement).position === "fixed") {
      return true;
    }
    currElement = currElement.parentElement;
  }

  return false;
};

export default isFixed;
