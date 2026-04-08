import type { Config, RootData } from "@puckeditor/core";
import { toRootComponent } from "./src/lib/views";
import {
  applyNodeViews,
  DEFAULT_NODE_STATE_KEY,
  DEFAULT_STORAGE_KEY,
} from "./src/lib/views";
import type { ViewsPluginOptions } from "./src/types";

const wrapResolveData = (
  configItem: Record<string, any> | undefined,
  options: ViewsPluginOptions,
  isRoot: boolean = false
) => {
  if (!configItem) {
    return configItem;
  }

  const existingResolveData = configItem.resolveData;

  return {
    ...configItem,
    resolveData: async (data: any, params: any) => {
      const baseData = existingResolveData
        ? await existingResolveData(data, params)
        : data;
      const mergedData = {
        ...data,
        ...baseData,
        props: {
          ...data.props,
          ...(baseData?.props ?? {}),
        },
      };
      const root =
        isRoot && mergedData.props
          ? toRootComponent({
              props: {
                ...mergedData.props,
              },
              readOnly: mergedData.readOnly,
            } as RootData)
          : params.root;

      return applyNodeViews({
        data: mergedData,
        metadata: params.metadata,
        root,
        options: {
          ...options,
          nodeStateKey: options.nodeStateKey ?? DEFAULT_NODE_STATE_KEY,
          storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
        },
      });
    },
  };
};

export const withViews = <UserConfig extends Config>(
  config: UserConfig,
  options: ViewsPluginOptions
): UserConfig => {
  const normalizedOptions = {
    ...options,
    nodeStateKey: options.nodeStateKey ?? DEFAULT_NODE_STATE_KEY,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
  };

  return {
    ...config,
    root: wrapResolveData(config.root, normalizedOptions, true),
    components: Object.entries(config.components).reduce<
      UserConfig["components"]
    >(
      (acc, [componentName, componentConfig]) => ({
        ...acc,
        [componentName]: wrapResolveData(componentConfig, normalizedOptions),
      }),
      {} as UserConfig["components"]
    ),
  };
};
