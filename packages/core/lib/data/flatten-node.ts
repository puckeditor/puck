import flat from "flat";
import { ComponentData, Config, RootData, UserGenerics } from "../../types";
import { stripSlots } from "./strip-slots";

// Explicitly destructure to account for flat module issues: https://github.com/puckeditor/puck/issues/1089
const { flatten, unflatten } = flat;

const isPureObject = (val: any) =>
  val != null && Object.prototype.toString.call(val) === "[object Object]";

const emptyArrayStr = "__puck_[]";
const emptyObjectStr = "__puck_{}";

function encodeEmptyObjects(props: Record<string, any> = {}) {
  const result: Record<string, any> = {};

  for (const key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

    const val = props[key];

    if (Array.isArray(val)) {
      result[key] = emptyArrayStr;
    } else if (isPureObject(val) && Object.keys(val).length === 0) {
      result[key] = emptyObjectStr;
    } else {
      result[key] = val;
    }
  }

  return result;
}

function decodeEmptyObjects(props: Record<string, any> = {}) {
  const result: Record<string, any> = {};

  for (const key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

    const val = props[key];

    if (val === emptyArrayStr) {
      result[key] = [];
    } else if (val === emptyObjectStr) {
      result[key] = {};
    } else {
      result[key] = val;
    }
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
    props: encodeEmptyObjects(flatten(stripSlots(node, config).props)),
  };
};

export const expandNode = (node: ComponentData | RootData) => {
  const props = unflatten(decodeEmptyObjects(node.props));

  return {
    ...node,
    props,
  };
};
