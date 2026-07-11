import {
  defineComponent,
  getCurrentInstance,
  h as vueH,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
  type App,
} from "vue";
import { createEditorHost, type EditorProps } from "../shim";
import { transformConfig, transformFieldTypes } from "../transform-config";
import type {
  Data,
  UiState,
  Permissions,
  Viewports,
  IframeConfig,
  InitialHistory,
  Metadata,
  Plugin,
  Overrides,
  PuckProps,
  PuckApi,
  AppState,
} from "../core";
import type { PuckAction } from "../core";
import type { VueConfig, VueComponent } from "../types";

/**
 * Vue `<Puck>` — the full Puck editor, driven by a Vue config.
 *
 * A thin shell over the shared `createEditorHost`: it renders one host `<div>`,
 * translates Vue props/emits into host calls, and lets the shared host own the
 * Preact render into that div. `data` is initial-only (matches React `<Puck>`;
 * `update:data` is emitted so `v-model:data` works for persistence); a `config`
 * identity change is a documented full remount.
 */
export const Puck = defineComponent({
  name: "PuckEditor",
  props: {
    config: { type: Object as PropType<VueConfig>, required: true },
    data: {
      type: Object as PropType<Partial<Data>>,
      required: true,
    },
    ui: {
      type: Object as PropType<Partial<UiState>>,
      default: undefined,
    },
    permissions: {
      type: Object as PropType<Partial<Permissions>>,
      default: undefined,
    },
    viewports: { type: Array as PropType<Viewports>, default: undefined },
    iframe: {
      type: Object as PropType<IframeConfig>,
      default: undefined,
    },
    dnd: {
      type: Object as PropType<PuckProps["dnd"]>,
      default: undefined,
    },
    initialHistory: {
      type: Object as PropType<InitialHistory>,
      default: undefined,
    },
    metadata: {
      type: Object as PropType<Metadata>,
      default: undefined,
    },
    headerTitle: { type: String, default: undefined },
    headerPath: { type: String, default: undefined },
    height: { type: [String, Number], default: undefined },
    /** Advanced: Preact-based overrides, passed through to core. */
    overrides: {
      type: Object as PropType<Partial<Overrides>>,
      default: undefined,
    },
    /** Advanced: Preact-based plugins, passed through to core. */
    plugins: { type: Array as PropType<Plugin[]>, default: undefined },
    /** Advanced: Preact-based field transforms, passed through to core. */
    fieldTransforms: {
      type: Object as PropType<PuckProps["fieldTransforms"]>,
      default: undefined,
    },
    /**
     * Vue components that replace built-in Puck field UIs, keyed by field type
     * (mapped onto `overrides.fieldTypes`).
     */
    fieldTypes: {
      type: Object as PropType<Record<string, VueComponent>>,
      default: undefined,
    },
    /**
     * Override the Vue app context threaded into every bridged Vue component
     * mount. Defaults to the context of the app rendering `<Puck>` (so
     * app-level plugins/provides — Pinia, router, i18n — just work); pass an
     * (unmounted) `createApp(...)` instance to substitute a different one.
     * Read once at setup.
     */
    app: { type: Object as PropType<App>, default: undefined },
    _experimentalFullScreenCanvas: { type: Boolean, default: undefined },
    _experimentalVirtualization: { type: Boolean, default: undefined },
  },
  emits: {
    change: (data: Data) => true,
    "update:data": (data: Data) => true,
    publish: (data: Data) => true,
    action: (action: PuckAction, appState: AppState, prevAppState: AppState) =>
      true,
    ready: (getPuck: () => PuckApi) => true,
  },
  setup(props, { emit }) {
    let hostEl: HTMLElement | null = null;
    const setHost = (el: any) => {
      hostEl = (el as HTMLElement) ?? null;
    };

    // Default to the hosting app's context so app-level plugins/provides reach
    // bridged components with zero ceremony; `app` overrides it.
    const instance = getCurrentInstance();
    const appContext =
      (props.app as any)?._context ?? instance?.appContext ?? null;

    const host = createEditorHost({
      transformConfig: (config) => transformConfig(config, { appContext }),
      transformFieldTypes: (fieldTypes) =>
        transformFieldTypes(fieldTypes, { appContext }),
    });

    // Callbacks created once with stable identity; `emit` always dispatches to
    // the *current* listener, so swapped `@change` handlers never go stale.
    const onChange = (data: Data) => {
      emit("change", data);
      emit("update:data", data);
    };
    const onPublish = (data: Data) => emit("publish", data);
    const onAction = (
      action: PuckAction,
      appState: AppState,
      prevAppState: AppState
    ) => emit("action", action, appState, prevAppState);
    const onReady = (getPuck: () => PuckApi) => emit("ready", getPuck);

    const collectProps = (): EditorProps => ({
      config: props.config,
      data: props.data,
      ui: props.ui,
      permissions: props.permissions,
      viewports: props.viewports,
      iframe: props.iframe,
      dnd: props.dnd,
      initialHistory: props.initialHistory,
      metadata: props.metadata,
      headerTitle: props.headerTitle,
      headerPath: props.headerPath,
      height: props.height,
      overrides: props.overrides,
      plugins: props.plugins,
      fieldTransforms: props.fieldTransforms,
      fieldTypes: props.fieldTypes,
      _experimentalFullScreenCanvas: props._experimentalFullScreenCanvas,
      _experimentalVirtualization: props._experimentalVirtualization,
      onChange,
      onPublish,
      onAction,
      onReady,
    });

    onMounted(() => {
      if (hostEl) host.mount(hostEl, collectProps());
    });

    // Passthrough props: reconcile in place, editor state survives. (`data`,
    // `ui` and `initialHistory` are initial-only in core, so not watched.)
    watch(
      () => [
        props.permissions,
        props.viewports,
        props.iframe,
        props.dnd,
        props.metadata,
        props.headerTitle,
        props.headerPath,
        props.height,
        props.plugins,
        props.overrides,
        props.fieldTransforms,
        props.fieldTypes,
        props._experimentalFullScreenCanvas,
        props._experimentalVirtualization,
      ],
      () => host.update(collectProps())
    );

    // config identity change ⇒ documented full remount.
    watch(
      () => props.config,
      () => host.updateConfig(collectProps())
    );

    onBeforeUnmount(() => host.unmount());

    return () => vueH("div", { ref: setHost });
  },
});
