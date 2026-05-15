import { ComponentData, RootData } from "@puckeditor/core";

import { normalizeRootData } from "./normalize-root-data";

/**
 * Converts root data into a component data object
 *
 * @param root The raw root data or root component
 * @returns The root data as a component, or null when no root was provided
 */
export const toRootComponent = (
  root?: RootData | ComponentData | null
): ComponentData | null => {
  if (!root) {
    return null;
  }

  if ("type" in root) {
    return root;
  }

  const normalized = normalizeRootData(root);

  return {
    type: "root",
    props: {
      id: "root",
      ...normalized.props,
    },
    readOnly: normalized.readOnly,
  };
};
