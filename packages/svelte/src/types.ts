import type { Component } from "svelte";
import type {
  FrameworkConfig,
  FrameworkComponentConfig,
  FrameworkRootConfig,
  FrameworkField,
  FrameworkFields,
  FrameworkCustomField,
} from "./shim";
import type { Field } from "./core";

/**
 * A Svelte component supplied by the user as a Puck component's `render`, a
 * custom field's `render`, or a `fieldTypes` override.
 */
export type SvelteComponent = Component<any, any>;

/**
 * A custom field whose `render` is a Svelte component (instead of a React one).
 */
export type SvelteCustomField = FrameworkCustomField<SvelteComponent>;

/**
 * A field in a `SvelteConfig`: any core field, or a custom field with a Svelte
 * `render`. (Custom Svelte fields nested inside object/array fields are
 * supported at runtime but typed as core fields — cast the `render` if
 * TypeScript complains there.)
 */
export type SvelteField = FrameworkField<SvelteComponent>;

/** Field map for a Svelte component/root config. */
export type SvelteFields = FrameworkFields<SvelteComponent>;

/**
 * Svelte equivalent of core's `ComponentConfig`: identical, except `render` is a
 * Svelte component and `fields` may use Svelte custom-field renders. Every other
 * key (defaultProps, resolveData, resolveFields, resolvePermissions, label,
 * category, inline, metadata) is framework-agnostic and passes through.
 */
export type SvelteComponentConfig<
  Props extends Record<string, any> = Record<string, any>
> = FrameworkComponentConfig<SvelteComponent, Props>;

/**
 * Svelte equivalent of core's `RootConfig`.
 */
export type SvelteRootConfig<Props extends Record<string, any> = any> =
  FrameworkRootConfig<SvelteComponent, Props>;

/**
 * The Svelte-facing config passed to `transformConfig`, `<Puck>` and `<Render>`.
 * Optionally generic over the component prop shapes for per-component
 * inference, mirroring core's `Config<Props>`:
 *
 * ```ts
 * const config: SvelteConfig<{ Heading: { title: string } }> = { ... };
 * ```
 */
export type SvelteConfig<
  Props extends Record<string, any> = Record<string, any>,
  RootProps extends Record<string, any> = any
> = FrameworkConfig<SvelteComponent, Props, RootProps>;

/**
 * Options for `transformConfig` / the per-component `defineSvelteComponent`.
 */
export type TransformConfigOptions = {
  /**
   * A `Map` of Svelte context entries threaded into every bridged Svelte mount
   * (via `setContext`), so shared app-level context (stores, clients) is
   * available. The analogue of Vue's `app` prop. Usually passed as the
   * `context` prop on `<Puck>` / `<Render>`.
   */
  context?: Map<any, any> | null;
};

/**
 * Convenience alias for a field definition (re-exported for authoring configs).
 */
export type { Field };
