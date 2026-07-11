import type {
  Config,
  ComponentConfig,
  RootConfig,
  Field,
  CustomField,
} from "./core";

/**
 * The framework-facing config types, generic over the framework's component
 * type `C` (Vue `Component`, Svelte `Component`, …). Each framework package
 * aliases these (e.g. `VueConfig<Props> = FrameworkConfig<VueComponent,
 * Props>`), so the shape is defined once.
 *
 * The optional `Props` record maps component names to their prop shapes,
 * mirroring core's `Config<Props>` per-component inference for `defaultProps`
 * / `resolveData` etc. (without core's full Params machinery).
 */

/** A custom field whose `render` is a framework component. */
export type FrameworkCustomField<C> = Omit<CustomField<any>, "render"> & {
  render: C;
};

/**
 * A field in a framework config: any core field, or a custom field with a
 * framework `render`.
 */
export type FrameworkField<C> = Field | FrameworkCustomField<C>;

/** Field map for a framework component/root config. */
export type FrameworkFields<C> = Record<string, FrameworkField<C>>;

/**
 * Framework equivalent of core's `ComponentConfig`: identical, except `render`
 * is a framework component and `fields` may use framework custom-field
 * renders. Every other key (resolveData, resolveFields, resolvePermissions,
 * label, category, inline, metadata) is framework-agnostic and passes
 * through. `Props` types `defaultProps` per component (core's conditional
 * `ComponentConfig<Props>` generic can't be re-parameterized from outside, so
 * resolve* signatures stay on the default prop shape).
 */
export type FrameworkComponentConfig<
  C,
  Props extends Record<string, any> = Record<string, any>
> = Omit<ComponentConfig, "render" | "fields" | "defaultProps"> & {
  render: C;
  fields?: FrameworkFields<C>;
  defaultProps?: Props;
};

/** Framework equivalent of core's `RootConfig`. */
export type FrameworkRootConfig<
  C,
  Props extends Record<string, any> = any
> = Omit<RootConfig, "render" | "fields" | "defaultProps"> & {
  render?: C;
  fields?: FrameworkFields<C>;
  defaultProps?: Props;
};

/**
 * The framework-facing config passed to `transformConfig` and the framework's
 * `<Puck>` / `<Render>` shells.
 */
export type FrameworkConfig<
  C,
  Props extends Record<string, any> = Record<string, any>,
  RootProps extends Record<string, any> = any
> = {
  components: {
    [ComponentName in keyof Props]: FrameworkComponentConfig<
      C,
      Props[ComponentName]
    >;
  };
  root?: FrameworkRootConfig<C, RootProps>;
  categories?: Config["categories"];
};
