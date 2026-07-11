import { createFrameworkApi } from "./shim";
import type { Config, Field } from "./core";
import type {
  VueConfig,
  VueComponent,
  TransformConfigOptions,
} from "./types";
import { makeVueAdapter } from "./adapter";

const api = createFrameworkApi<TransformConfigOptions>((opts) =>
  makeVueAdapter(opts.appContext ?? null)
);

/**
 * Convert a Vue `VueConfig` into a core `Config`.
 *
 * For each component (and `root`): derives outlet prop names from `fields`
 * (slots, richtext, contentEditable text), sets `inline: true`, replaces
 * `render` with the Vue bridge, and walks `fields` (recursively through
 * object/array, and through `resolveFields` results) wrapping any
 * `type: "custom"` Vue field renders. All other config keys pass through
 * untouched.
 */
export const transformConfig = (
  vueConfig: VueConfig,
  options: TransformConfigOptions = {}
): Config => api.transformConfig(vueConfig, options);

/**
 * Wrap a map of Vue components into `overrides.fieldTypes` (replacing built-in
 * field UIs). Used by `<Puck>`'s `fieldTypes` prop.
 */
export const transformFieldTypes = (
  fieldTypes: Record<string, VueComponent>,
  options: TransformConfigOptions = {}
): Record<string, any> => api.transformFieldTypes(fieldTypes, options);

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
) => api.defineComponent(component, options);

/**
 * Per-field escape hatch: wrap a single Vue component into a Puck-compatible
 * custom-field `render` (or `fieldTypes` override), for mixed configs.
 */
export const defineVueField = (
  component: VueComponent,
  options: TransformConfigOptions = {}
) => api.defineField(component, options);

export type { Field };
