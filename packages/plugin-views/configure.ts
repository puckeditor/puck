import type {
  ComponentConfig,
  Config,
  RootConfig,
  RootData,
} from "@puckeditor/core";
import { toRootComponent } from "./src/lib/views";
import {
  applyNodeViews,
  DEFAULT_NODE_STATE_KEY,
  DEFAULT_STORAGE_KEY,
} from "./src/lib/views";
import type { ViewsPluginOptions } from "./src/types";

const wrapResolveData = <T extends ComponentConfig | RootConfig>(
  configItem: T,
  options: ViewsPluginOptions,
  isRoot: boolean = false
): T => {
  const existingResolveData = configItem.resolveData;

  const newConfigItem = { ...configItem } as ComponentConfig;

  newConfigItem.resolveData = async (data, params) => {
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
  };

  return newConfigItem as T;
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

  const newConfig: UserConfig = { ...config };

  if (config.root) {
    newConfig.root = wrapResolveData(config.root, normalizedOptions, true);
  }

  Object.entries(config.components).forEach(
    ([componentName, componentConfig]) => {
      newConfig.components[componentName] = wrapResolveData(
        componentConfig,
        normalizedOptions
      );
    }
  );

  return newConfig;
};
