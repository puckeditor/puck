import { h, render as preactRender, Fragment } from "./runtime";
import { Puck as CorePuck, Render as CoreRender } from "./core";
import { ReadyBridge } from "./ready-bridge";

/**
 * The framework-agnostic controllers behind each framework's `<Puck>` /
 * `<Render>` shells. They own the imperative Preact render calls into a host
 * `<div>`: vnode building, `overrides.puck` + `fieldTypes` composition, the
 * ready bridge, and config-identity remount. The framework shell owns only its
 * reactivity/lifecycle (Vue `watch`/`onMounted`, Svelte `$effect`/`onMount`)
 * and translating its props/events into these calls.
 */

export type EditorProps = {
  config: any;
  data: any;
  ui?: any;
  permissions?: any;
  viewports?: any;
  iframe?: any;
  initialHistory?: any;
  metadata?: any;
  headerTitle?: any;
  headerPath?: any;
  height?: any;
  /** Advanced: Preact-based overrides, passed through to core. */
  overrides?: any;
  /** Advanced: Preact-based plugins, passed through to core. */
  plugins?: any;
  /** Framework components that replace built-in field UIs, keyed by field type. */
  fieldTypes?: any;
  onChange?: (data: any) => void;
  onPublish?: (data: any) => void;
  onAction?: (action: any, appState: any, prevAppState: any) => void;
  onReady?: (getPuck: any) => void;
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

  const latest: Pick<
    EditorProps,
    "onChange" | "onPublish" | "onAction" | "onReady"
  > = {};
  const onChange = (data: any) => latest.onChange?.(data);
  const onPublish = (data: any) => latest.onPublish?.(data);
  const onAction = (action: any, appState: any, prev: any) =>
    latest.onAction?.(action, appState, prev);
  const onReady = (getPuck: any) => latest.onReady?.(getPuck);

  const syncCallbacks = () => {
    latest.onChange = props?.onChange;
    latest.onPublish = props?.onPublish;
    latest.onAction = props?.onAction;
    latest.onReady = props?.onReady;
  };

  // Inject the ready bridge via `overrides.puck`, which receives the default
  // editor layout as `children` — so we augment (not replace) the editor and
  // stay inside the Puck store context. Composes with a user override.
  const buildOverrides = () => {
    const userOverrides = { ...(props?.overrides ?? {}) } as Record<
      string,
      any
    >;
    const userPuck = userOverrides.puck;

    if (props?.fieldTypes) {
      userOverrides.fieldTypes = {
        ...deps.transformFieldTypes(props.fieldTypes),
        ...(userOverrides.fieldTypes ?? {}),
      };
    }

    return {
      ...userOverrides,
      puck: ({ children }: { children: any }) =>
        h(
          Fragment,
          null,
          userPuck ? userPuck({ children }) : children,
          h(ReadyBridge as any, { onReady })
        ),
    };
  };

  const buildVnode = () =>
    h(CorePuck as any, {
      config: transformed,
      data: props!.data, // initial-only; core ignores later values
      ui: props!.ui,
      permissions: props!.permissions,
      viewports: props!.viewports,
      iframe: props!.iframe,
      initialHistory: props!.initialHistory,
      metadata: props!.metadata,
      headerTitle: props!.headerTitle,
      headerPath: props!.headerPath,
      height: props!.height,
      plugins: props!.plugins,
      overrides: buildOverrides(),
      onChange,
      onPublish,
      onAction,
    });

  const render = () => {
    if (hostEl) preactRender(buildVnode(), hostEl);
  };

  return {
    mount(el: HTMLElement, initialProps: EditorProps) {
      hostEl = el;
      props = initialProps;
      syncCallbacks();
      transformed = deps.transformConfig(props.config);
      render();
    },
    /** Passthrough prop change: reconcile in place, editor state survives. */
    update(nextProps: EditorProps) {
      props = nextProps;
      syncCallbacks();
      render();
    },
    /** `config` identity change ⇒ documented full remount. */
    updateConfig(nextProps: EditorProps) {
      props = nextProps;
      syncCallbacks();
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
