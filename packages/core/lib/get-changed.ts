import { ComponentData } from "../types";
import { deepEqual } from "fast-equals";

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
          [item]: !deepEqual(oldItemProps[item], newItemProps[item]),
        };
      }, {})
    : {};
};
