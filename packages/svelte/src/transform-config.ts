import {
  createTransformConfig,
  createComponentBridge,
  createFieldBridge,
} from "@puckeditor/framework-shim";
import type { Config, Field } from "./core";
import type {
  SvelteConfig,
  SvelteComponent,
  TransformConfigOptions,
} from "./types";
import { makeSvelteAdapter } from "./adapter";

/** Per-call wrap options threaded through the shared config walker. */
type SvelteWrapOptions = { context?: Map<any, any> | null };

const { transformConfig: walkConfig, transformFieldTypes: walkFieldTypes } =
  createTransformConfig<SvelteWrapOptions>({
    wrapComponent: (render, opts, { context = null }) =>
      createComponentBridge(makeSvelteAdapter(context), render, opts),
    wrapField: (render, { context = null }) =>
      createFieldBridge(makeSvelteAdapter(context), render),
  });

/**
 * Convert a Svelte `SvelteConfig` into a core `Config`.
 *
 * For each component (and `root`): derives slot prop names from `fields`, sets
 * `inline: true`, replaces `render` with the Svelte bridge, and walks `fields`
 * (recursively through object/array) wrapping any `type: "custom"` Svelte field
 * renders. All other config keys pass through untouched.
 */
export const transformConfig = (
  svelteConfig: SvelteConfig,
  options: TransformConfigOptions = {}
): Config => walkConfig(svelteConfig, options);

/**
 * Wrap a map of Svelte components into `overrides.fieldTypes` (replacing
 * built-in field UIs). Used by `<Puck>`'s `fieldTypes` prop.
 */
export const transformFieldTypes = (
  fieldTypes: Record<string, SvelteComponent>,
  options: TransformConfigOptions = {}
): Record<string, any> => walkFieldTypes(fieldTypes, options);

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
) =>
  createComponentBridge(
    makeSvelteAdapter(options.context ?? null),
    component,
    { slotPropNames: options.slotPropNames, isRoot: options.isRoot }
  );

/**
 * Per-field escape hatch: wrap a single Svelte component into a Puck-compatible
 * custom-field `render` (or `fieldTypes` override), for mixed configs.
 */
export const defineSvelteField = (
  component: SvelteComponent,
  options: TransformConfigOptions = {}
) => createFieldBridge(makeSvelteAdapter(options.context ?? null), component);

export type { Field };
