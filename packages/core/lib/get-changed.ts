import { ComponentData } from "../types";
import { getNestedDiff } from "./data/get-nested-diff";

export const getChanged = (
  newItem: Omit<Partial<ComponentData<any>>, "type"> | undefined,
  oldItem: Omit<Partial<ComponentData<any>>, "type"> | null | undefined
) => {
  if (!newItem) {
    return {};
  }

  const newItemProps = newItem?.props || {};
  const oldItemProps = oldItem?.props || {};

  return getNestedDiff(newItemProps, oldItemProps);
};
