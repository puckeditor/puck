import flat from "flat";
import { ComponentData, Config, RootData, UserGenerics } from "../../types";
import { stripSlots } from "./strip-slots";

// Explicitly destructure to account for flat module issues: https://github.com/puckeditor/puck/issues/1089
const { flatten, unflatten } = flat;

function isEmptyArrayOrObject(val: any): boolean {
  if (Array.isArray(val)) {
    return val.length === 0;
  }

  if (
    val != null &&
    Object.prototype.toString.call(val) === "[object Object]"
  ) {
    return Object.keys(val).length === 0;
  }

  return false;
}

function stripEmptyObjects(props: Record<string, any>) {
  const result: Record<string, any> = {};

  for (const key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

    const val = props[key];
    if (isEmptyArrayOrObject(val)) continue;

    result[key] = val;
  }

  return result;
}

export const flattenNode = <
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>(
  node: ComponentData | RootData,
  config: UserConfig
) => {
  return {
    ...node,
    props: stripEmptyObjects(flatten(stripSlots(node, config).props)),
  };
};

export const expandNode = (node: ComponentData | RootData) => {
  const props = unflatten(node.props);

  return {
    ...node,
    props,
  };
};
