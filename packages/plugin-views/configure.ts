import type {
  ComponentConfig,
  Config,
  RootConfig,
  RootData,
} from "@puckeditor/core";

import { RENDER_DATA_BINDING_KEY, toRootComponent } from "./src/lib/views";
import mapObjectValues from "./src/lib/map-object-values";
import transformFields from "./src/lib/transform-fields";
import {
  applyNodeViews,
  DEFAULT_NODE_STATE_KEY,
  DEFAULT_STORAGE_KEY,
} from "./src/lib/views";
import type { ViewsPluginOptions } from "./src/types";

const wrapComponentConfig = <T extends ComponentConfig | RootConfig>(
  configItem: T,
  options: ViewsPluginOptions,
  isRoot: boolean = false
): T => {
  // Make all component fields render data bindings buttons
  const newConfigItem = transformFields(configItem, (field) => ({
    ...field,
    metadata: {
      ...field.metadata,
      [RENDER_DATA_BINDING_KEY]: true,
    },
  })) as ComponentConfig;

  const existingResolveFields = configItem.resolveFields;

  // Ensure that resolved fields always have the data bindings button
  newConfigItem.resolveFields = async (data, params) => {
    if (!existingResolveFields) return params.fields;

    const resolvedFields = await existingResolveFields(data, params);

    return mapObjectValues(resolvedFields, (field) => {
      if (!field) return field;

      return {
        ...field,
        metadata: { ...field.metadata, [RENDER_DATA_BINDING_KEY]: true },
      };
    });
  };

  const existingResolveData = configItem.resolveData;

  // Add view data to component data every time resolveData is called
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
    const newRoot = { ...config.root };

    // Root includes a title field by default
    // Add the default title field if no fields are defined to ensure the data bindings button is rendered in the root
    if (config.root.fields === undefined) {
      newRoot.fields = {
        title: { type: "text" },
      };
    }

    newConfig.root = wrapComponentConfig(newRoot, normalizedOptions, true);
  }

  Object.entries(config.components).forEach(
    ([componentName, componentConfig]) => {
      newConfig.components[componentName] = wrapComponentConfig(
        componentConfig,
        normalizedOptions
      );
    }
  );

  return newConfig;
};
