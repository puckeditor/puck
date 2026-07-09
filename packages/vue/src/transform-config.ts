import {
  createTransformConfig,
  createComponentBridge,
  createFieldBridge,
} from "@puckeditor/framework-shim";
import type { AppContext } from "vue";
import type { Config, Field } from "./core";
import type {
  VueConfig,
  VueComponent,
  TransformConfigOptions,
} from "./types";
import { makeVueAdapter } from "./adapter";

/** Per-call wrap options threaded through the shared config walker. */
type VueWrapOptions = { appContext?: AppContext | null };

const { transformConfig: walkConfig, transformFieldTypes: walkFieldTypes } =
  createTransformConfig<VueWrapOptions>({
    wrapComponent: (render, opts, { appContext = null }) =>
      createComponentBridge(makeVueAdapter(appContext), render, opts),
    wrapField: (render, { appContext = null }) =>
      createFieldBridge(makeVueAdapter(appContext), render),
  });

/**
 * Convert a Vue `VueConfig` into a core `Config`.
 *
 * For each component (and `root`): derives slot prop names from `fields`, sets
 * `inline: true`, replaces `render` with the Vue bridge, and walks `fields`
 * (recursively through object/array) wrapping any `type: "custom"` Vue field
 * renders. All other config keys pass through untouched.
 */
export const transformConfig = (
  vueConfig: VueConfig,
  options: TransformConfigOptions = {}
): Config => walkConfig(vueConfig, options);

/**
 * Wrap a map of Vue components into `overrides.fieldTypes` (replacing built-in
 * field UIs). Used by `<Puck>`'s `fieldTypes` prop.
 */
export const transformFieldTypes = (
  fieldTypes: Record<string, VueComponent>,
  options: TransformConfigOptions = {}
): Record<string, any> => walkFieldTypes(fieldTypes, options);

/**
 * Per-component escape hatch: wrap a single Vue component into a Puck-compatible
 * `render`, for mixed React/Vue configs.
 */
export const defineVueComponent = (
  component: VueComponent,
  options: TransformConfigOptions & {
    slotPropNames?: string[];
    isRoot?: boolean;
  } = {}
) =>
  createComponentBridge(makeVueAdapter(options.appContext ?? null), component, {
    slotPropNames: options.slotPropNames,
    isRoot: options.isRoot,
  });

/**
 * Per-field escape hatch: wrap a single Vue component into a Puck-compatible
 * custom-field `render` (or `fieldTypes` override), for mixed configs.
 */
export const defineVueField = (
  component: VueComponent,
  options: TransformConfigOptions = {}
) => createFieldBridge(makeVueAdapter(options.appContext ?? null), component);

export type { Field };
