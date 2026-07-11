import { createFrameworkApi } from "./shim";
import type { Config, Field } from "./core";
import type {
  SvelteConfig,
  SvelteComponent,
  TransformConfigOptions,
} from "./types";
import { makeSvelteAdapter } from "./adapter";

const api = createFrameworkApi<TransformConfigOptions>((opts) =>
  makeSvelteAdapter(opts.context ?? null)
);

/**
 * Convert a Svelte `SvelteConfig` into a core `Config`.
 *
 * For each component (and `root`): derives outlet prop names from `fields`
 * (slots, richtext, contentEditable text), sets `inline: true`, replaces
 * `render` with the Svelte bridge, and walks `fields` (recursively through
 * object/array, and through `resolveFields` results) wrapping any
 * `type: "custom"` Svelte field renders. All other config keys pass through
 * untouched.
 */
export const transformConfig = (
  svelteConfig: SvelteConfig,
  options: TransformConfigOptions = {}
): Config => api.transformConfig(svelteConfig, options);

/**
 * Wrap a map of Svelte components into `overrides.fieldTypes` (replacing
 * built-in field UIs). Used by `<Puck>`'s `fieldTypes` prop.
 */
export const transformFieldTypes = (
  fieldTypes: Record<string, SvelteComponent>,
  options: TransformConfigOptions = {}
): Record<string, any> => api.transformFieldTypes(fieldTypes, options);

/**
 * Per-component escape hatch: wrap a single Svelte component into a
 * Puck-compatible `render`, for mixed React/Svelte configs.
 */
export const defineSvelteComponent = (
  component: SvelteComponent,
  options: TransformConfigOptions & {
    slotPropNames?: string[];
    isRoot?: boolean;
  } = {}
) => api.defineComponent(component, options);

/**
 * Per-field escape hatch: wrap a single Svelte component into a Puck-compatible
 * custom-field `render` (or `fieldTypes` override), for mixed configs.
 */
export const defineSvelteField = (
  component: SvelteComponent,
  options: TransformConfigOptions = {}
) => api.defineField(component, options);

export type { Field };
