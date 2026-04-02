import type { FC } from "react";
import { Overrides, Plugin } from "../types";

type CacheEntry = {
  comp: FC<any>;
  childNode: ((props: any) => any) | undefined;
};

const wrapperCache = new WeakMap<object, Map<string, CacheEntry>>();

function getOrCreateWrapper(
  cacheKey: object,
  name: string,
  overrideFn: (props: any) => any,
  childNode: ((props: any) => any) | undefined
): FC<any> {
  let typeMap = wrapperCache.get(cacheKey);
  if (!typeMap) {
    typeMap = new Map();
    wrapperCache.set(cacheKey, typeMap);
  }

  const entry = typeMap.get(name);

  if (entry && entry.childNode === childNode) {
    return entry.comp;
  }

  const comp: FC<any> = (props: any) =>
    overrideFn({
      ...props,
      children: childNode ? childNode(props) : props.children,
    });

  comp.displayName = `PluginOverride(${name})`;
  typeMap.set(name, { comp, childNode });

  return comp;
}

export const loadOverrides = ({
  overrides,
  plugins,
}: {
  overrides?: Partial<Overrides>;
  plugins?: Plugin[];
}) => {
  const collected: Partial<Overrides> = { ...overrides };

  plugins?.forEach((plugin) => {
    if (!plugin.overrides) return;

    Object.keys(plugin.overrides).forEach((_overridesType) => {
      const overridesType = _overridesType as keyof Overrides;

      if (!plugin.overrides?.[overridesType]) return;

      if (overridesType === "fieldTypes") {
        const fieldTypes = plugin.overrides!.fieldTypes!;
        Object.keys(fieldTypes).forEach((fieldType) => {
          collected.fieldTypes = collected.fieldTypes || {};

          const childNode = collected.fieldTypes[fieldType];
          collected.fieldTypes[fieldType] = getOrCreateWrapper(
            fieldTypes,
            fieldType,
            fieldTypes[fieldType]!,
            childNode
          );
        });

        return;
      }

      const childNode = collected[overridesType];
      collected[overridesType] = getOrCreateWrapper(
        plugin.overrides,
        overridesType,
        plugin.overrides[overridesType]! as (props: any) => any,
        childNode
      );
    });
  });

  return collected;
};
