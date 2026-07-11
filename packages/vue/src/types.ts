import type { Component, AppContext } from "vue";
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
 * A Vue component supplied by the user as a Puck component's `render`, a custom
 * field's `render`, or a `fieldTypes` override.
 */
export type VueComponent = Component;

/**
 * The prop type of a node-valued field (slot, richtext, contentEditable text)
 * as received by a Vue component: always a renderable outlet component (in
 * both the editor and `<Render>`), placed with `<component :is>`:
 *
 * ```vue
 * <script setup lang="ts">
 * import type { VueSlot } from "@puckeditor/vue";
 * defineProps<{ title?: VueSlot; content?: VueSlot }>();
 * </script>
 * <template>
 *   <h1><component :is="title" /></h1>
 *   <component :is="content" />
 * </template>
 * ```
 */
export type VueSlot = Component;

/**
 * A custom field whose `render` is a Vue component (instead of a React one).
 */
export type VueCustomField = FrameworkCustomField<VueComponent>;

/**
 * A field in a `VueConfig`: any core field, or a custom field with a Vue
 * `render`. (Custom Vue fields nested inside object/array fields are supported
 * at runtime but typed as core fields — cast the `render` if TypeScript
 * complains there.)
 */
export type VueField = FrameworkField<VueComponent>;

/** Field map for a Vue component/root config. */
export type VueFields = FrameworkFields<VueComponent>;

/**
 * Vue equivalent of core's `ComponentConfig`: identical, except `render` is a
 * Vue component and `fields` may use Vue custom-field renders. Every other key
 * (defaultProps, resolveData, resolveFields, resolvePermissions, label,
 * category, inline, metadata) is framework-agnostic and passes through.
 */
export type VueComponentConfig<
  Props extends Record<string, any> = Record<string, any>
> = FrameworkComponentConfig<VueComponent, Props>;

/**
 * Vue equivalent of core's `RootConfig`.
 */
export type VueRootConfig<Props extends Record<string, any> = any> =
  FrameworkRootConfig<VueComponent, Props>;

/**
 * The Vue-facing config passed to `transformConfig`, `<Puck>` and `<Render>`.
 * Optionally generic over the component prop shapes for per-component
 * inference, mirroring core's `Config<Props>`:
 *
 * ```ts
 * const config: VueConfig<{ Heading: { title: string } }> = { ... };
 * ```
 */
export type VueConfig<
  Props extends Record<string, any> = Record<string, any>,
  RootProps extends Record<string, any> = any
> = FrameworkConfig<VueComponent, Props, RootProps>;

/**
 * Options for `transformConfig` / the per-component `defineVueComponent`.
 */
export type TransformConfigOptions = {
  /**
   * The `_context` of a Vue app instance, threaded into every bridged Vue
   * mount so app-level plugins / provides (e.g. Pinia) are available. `<Puck>`
   * and `<Render>` default this to the context of the app rendering them.
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
