import { ComponentData } from "../types";
import fdeq from "fast-deep-equal";

export const getChanged = (
  newItem: Omit<Partial<ComponentData<any>>, "type"> | undefined,
  oldItem: Omit<Partial<ComponentData<any>>, "type"> | null | undefined
) => {
  return newItem
    ? Object.keys(newItem.props || {}).reduce((acc, item) => {
        const newItemProps = newItem?.props || {};
        const oldItemProps = oldItem?.props || {};

        return {
          ...acc,
          [item]: !fdeq(oldItemProps[item], newItemProps[item]),
        };
      }, {})
    : {};
};
