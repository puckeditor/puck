/**
 * Returns true if the DOM node is an element that contains the given data attribute or has a descendant that contains the given data attribute.
 *
 * @param node The DOM node to check.
 * @param dataAttr The data attribute to check for (e.g., "data-puck-tab-marker").
 * @returns True if the node is an element that contains the given data attribute or has a descendant that contains the given data attribute.
 */
const containsDataAttr = (node: Node, dataAttr: string) =>
  node instanceof Element &&
  (node.matches(`[${dataAttr}]`) || !!node.querySelector(`[${dataAttr}]`));

export default containsDataAttr;
