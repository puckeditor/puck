import { ComponentData, RootData } from "../../types";

export const toRoot = (item: ComponentData | RootData): RootData => {
  if ("type" in item && item.type !== "root") {
    throw new Error("Converting non-root item to root.");
  }

  const { readOnly } = item;

  if (item.props) {
    if ("id" in item.props) {
      const { id, ...props } = item.props;

      return { props, readOnly };
    }

    return { props: item.props, readOnly };
  }

  return { props: {}, readOnly };
};
