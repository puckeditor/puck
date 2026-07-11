import { h, render as preactRender } from "./runtime";
import { Puck as CorePuck, Render as CoreRender } from "./core";
import type { PuckProps, PuckApi } from "./core";

/**
 * The framework-agnostic controllers behind each framework's `<Puck>` /
 * `<Render>` shells. They own the imperative Preact render calls into a host
 * `<div>`: vnode building, `fieldTypes` composition into overrides, and
 * config-identity remount. The framework shell owns only its
 * reactivity/lifecycle (Vue `watch`/`onMounted`, Svelte `$effect`/`onMount`)
 * and translating its props/events into these calls.
 */

/**
 * Everything core's `<Puck>` accepts (typed via core's `PuckProps`, so a new
 * core prop is available here without touching the shim), except:
 *  - `config` is the *framework* config (transformed by the host);
 *  - `children` (Preact composition) is not part of the framework surface;
 *  - `fieldTypes` maps framework components onto `overrides.fieldTypes`.
 *
 * `overrides`/`plugins` remain the advanced Preact-based passthroughs.
 */
export type EditorProps = Omit<PuckProps, "config" | "children"> & {
  /** The framework config ({ components, root, ... } with framework renders). */
  config: any;
  /** Framework components that replace built-in field UIs, keyed by field type. */
  fieldTypes?: Record<string, any>;
};

export type EditorHostDeps = {
  /** The framework's `transformConfig`, pre-bound to any per-instance wrap options. */
  transformConfig: (config: any) => any;
  /** The framework's `transformFieldTypes`, pre-bound to any per-instance wrap options. */
  transformFieldTypes: (fieldTypes: any) => any;
};

/**
 * Create an imperative controller for core's `<Puck>`.
 *
 * - `mount` renders core's (preact-compiled) `Puck` into the host div.
 * - `update` re-invokes render with the SAME component identity on the SAME
 *   container, so Preact reconciles in place and editor state survives. `data`
 *   is initial-only (core ignores later values), matching React `<Puck>`.
 * - `updateConfig` is a documented full remount for a `config` identity change.
 *
 * Callbacks are wrapped so core sees ONE stable identity across updates (core
 * resubscribes on identity change, so fresh closures each render would thrash),
 * even if the framework shell hands fresh closures each time.
 */
export const createEditorHost = (deps: EditorHostDeps) => {
  let hostEl: HTMLElement | null = null;
  let props: EditorProps | null = null;
  let transformed: any = null;

  const onChange = (data: any) => props?.onChange?.(data);
  const onPublish = (data: any) => props?.onPublish?.(data);
  const onAction = (action: any, appState: any, prev: any) =>
    props?.onAction?.(action, appState, prev);
  const onReady = (getPuck: () => PuckApi) => props?.onReady?.(getPuck);

  // Compose framework `fieldTypes` into `overrides.fieldTypes` (user-supplied
  // Preact overrides win on conflict).
  const buildOverrides = () => {
    const userOverrides = { ...(props?.overrides ?? {}) } as Record<
      string,
      any
    >;

    if (props?.fieldTypes) {
      userOverrides.fieldTypes = {
        ...deps.transformFieldTypes(props.fieldTypes),
        ...(userOverrides.fieldTypes ?? {}),
      };
    }

    return userOverrides;
  };

  const buildVnode = () => {
    const {
      config: _config,
      data,
      overrides: _overrides,
      fieldTypes: _fieldTypes,
      onChange: _onChange,
      onPublish: _onPublish,
      onAction: _onAction,
      onReady: _onReady,
      ...passthrough
    } = props!;

    return h(CorePuck as any, {
      // ui, permissions, viewports, iframe, dnd, fieldTransforms,
      // initialHistory, metadata, headerTitle, headerPath, height, plugins,
      // experimental flags, and any future core prop.
      ...passthrough,
      config: transformed,
      data, // initial-only; core ignores later values
      overrides: buildOverrides(),
      onChange,
      onPublish,
      onAction,
      onReady,
    });
  };

  const render = () => {
    if (hostEl) preactRender(buildVnode(), hostEl);
  };

  return {
    mount(el: HTMLElement, initialProps: EditorProps) {
      hostEl = el;
      props = initialProps;
      transformed = deps.transformConfig(props.config);
      render();
    },
    /** Passthrough prop change: reconcile in place, editor state survives. */
    update(nextProps: EditorProps) {
      props = nextProps;
      render();
    },
    /** `config` identity change ⇒ documented full remount. */
    updateConfig(nextProps: EditorProps) {
      props = nextProps;
      if (hostEl) preactRender(null, hostEl);
      transformed = deps.transformConfig(props.config);
      render();
    },
    unmount() {
      // Tearing down the Preact tree runs its cleanups, which unmount every
      // embedded framework root.
      if (hostEl) preactRender(null, hostEl);
    },
  };
};

export type RenderProps = {
  config: any;
  data: any;
  metadata?: any;
};

export type RenderHostDeps = {
  transformConfig: (config: any) => any;
};

/**
 * Create an imperative controller for core's `<Render>`.
 *
 * Stateless: re-invokes the Preact render on any prop change. `config` is
 * re-transformed only on identity change; everything else re-renders freely.
 */
export const createRenderHost = (deps: RenderHostDeps) => {
  let hostEl: HTMLElement | null = null;
  let props: RenderProps | null = null;
  let transformed: any = null;
  let lastConfig: any = null;

  const renderInto = () => {
    if (!hostEl || !props) return;
    if (props.config !== lastConfig) {
      transformed = deps.transformConfig(props.config);
      lastConfig = props.config;
    }
    preactRender(
      h(CoreRender as any, {
        config: transformed,
        data: props.data,
        metadata: props.metadata,
      }),
      hostEl
    );
  };

  return {
    mount(el: HTMLElement, initialProps: RenderProps) {
      hostEl = el;
      props = initialProps;
      transformed = deps.transformConfig(initialProps.config);
      lastConfig = initialProps.config;
      renderInto();
    },
    update(nextProps: RenderProps) {
      props = nextProps;
      renderInto();
    },
    unmount() {
      if (hostEl) preactRender(null, hostEl);
    },
  };
};
