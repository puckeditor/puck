import { RootData } from "@puckeditor/core";

/**
 * Normalizes Puck root data to always have props.
 *
 * @param root The raw root data (can contain or not props)
 * @returns A normalized root data object (with props and readOnly fields)
 */
export const normalizeRootData = (root?: RootData | null) => {
  if (!root) {
    return {
      props: {},
      readOnly: undefined,
    };
  }

  if ("props" in root && root.props) {
    return {
      props: root.props,
      readOnly: root.readOnly,
    };
  }

  return {
    props: root as Record<string, any>,
    readOnly: undefined,
  };
};
