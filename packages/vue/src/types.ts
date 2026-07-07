import type { Component, AppContext } from "vue";
import type {
  Config,
  ComponentConfig,
  RootConfig,
  Field,
  CustomField,
} from "./core";

/**
 * A Vue component supplied by the user as a Puck component's `render`, a custom
 * field's `render`, or a `fieldTypes` override.
 */
export type VueComponent = Component;

/**
 * A custom field whose `render` is a Vue component (instead of a React one).
 */
export type VueCustomField = Omit<CustomField<any>, "render"> & {
  render: VueComponent;
};

/**
 * A field in a `VueConfig`: any core field, or a custom field with a Vue
 * `render`. (Custom Vue fields nested inside object/array fields are supported
 * at runtime but typed as core fields — cast the `render` if TypeScript
 * complains there.)
 */
export type VueField = Field | VueCustomField;

/** Field map for a Vue component/root config. */
export type VueFields = Record<string, VueField>;

/**
 * Vue equivalent of core's `ComponentConfig`: identical, except `render` is a
 * Vue component and `fields` may use Vue custom-field renders. Every other key
 * (defaultProps, resolveData, resolveFields, resolvePermissions, label,
 * category, inline, metadata) is framework-agnostic and passes through.
 */
export type VueComponentConfig = Omit<ComponentConfig, "render" | "fields"> & {
  render: VueComponent;
  fields?: VueFields;
};

/**
 * Vue equivalent of core's `RootConfig`.
 */
export type VueRootConfig = Omit<RootConfig, "render" | "fields"> & {
  render?: VueComponent;
  fields?: VueFields;
};

/**
 * The Vue-facing config passed to `transformConfig`, `<Puck>` and `<Render>`.
 */
export type VueConfig = {
  components: {
    [ComponentName in string]: VueComponentConfig;
  };
  root?: VueRootConfig;
  categories?: Config["categories"];
};

/**
 * Options for `transformConfig` / the per-component `defineVueComponent`.
 */
export type TransformConfigOptions = {
  /**
   * The `_context` of an (unmounted) Vue app instance, threaded into every
   * bridged Vue mount so shared plugins / provides (e.g. Pinia) are available.
   * Usually derived from the `app` prop passed to `<Puck>` / `<Render>`.
   *
   * To replace built-in field UIs with Vue components, use the `fieldTypes`
   * prop on `<Puck>` instead.
   */
  appContext?: AppContext | null;
};

/**
 * Options accepted by the `app` prop / bridge to thread Vue app context.
 */
export type { AppContext };

/**
 * Convenience alias for a field definition (re-exported for authoring configs).
 */
export type { Field };
