import {
  defineComponent,
  h as vueH,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
  type App,
} from "vue";
import { createEditorHost, type EditorProps } from "@puckeditor/framework-shim";
import { transformConfig, transformFieldTypes } from "../transform-config";
import type { VueConfig, VueComponent } from "../types";

/**
 * Vue `<Puck>` — the full Puck editor, driven by a Vue config.
 *
 * A thin shell over the shared `createEditorHost`: it renders one host `<div>`,
 * translates Vue props/emits into host calls, and lets the shared host own the
 * Preact render into that div. `data` is initial-only (matches React `<Puck>`);
 * a `config` identity change is a documented full remount.
 */
export const Puck = defineComponent({
  name: "PuckEditor",
  props: {
    config: { type: Object as PropType<VueConfig>, required: true },
    data: { type: Object as PropType<Record<string, any>>, required: true },
    ui: { type: Object as PropType<Record<string, any>>, default: undefined },
    permissions: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    viewports: { type: Array as PropType<any[]>, default: undefined },
    iframe: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    initialHistory: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    metadata: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    headerTitle: { type: String, default: undefined },
    headerPath: { type: String, default: undefined },
    height: { type: [String, Number], default: undefined },
    /** Advanced: Preact-based overrides, passed through to core. */
    overrides: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    /** Advanced: Preact-based plugins, passed through to core. */
    plugins: { type: Array as PropType<any[]>, default: undefined },
    /**
     * Vue components that replace built-in Puck field UIs, keyed by field type
     * (mapped onto `overrides.fieldTypes`).
     */
    fieldTypes: {
      type: Object as PropType<Record<string, VueComponent>>,
      default: undefined,
    },
    /**
     * An (unmounted) Vue app instance whose context (plugins / provides) is
     * threaded into every bridged Vue component mount.
     */
    app: { type: Object as PropType<App>, default: undefined },
  },
  emits: ["change", "publish", "action", "ready"],
  setup(props, { emit }) {
    let hostEl: HTMLElement | null = null;
    const setHost = (el: any) => {
      hostEl = (el as HTMLElement) ?? null;
    };

    const appContext = (props.app as any)?._context ?? null;

    const host = createEditorHost({
      transformConfig: (config) => transformConfig(config, { appContext }),
      transformFieldTypes: (fieldTypes) =>
        transformFieldTypes(fieldTypes, { appContext }),
    });

    // Callbacks created once with stable identity (the host also stabilises
    // them for core, but `emit` is stable so this is exact parity anyway).
    const onChange = (data: any) => emit("change", data);
    const onPublish = (data: any) => emit("publish", data);
    const onAction = (action: any, appState: any, prevAppState: any) =>
      emit("action", action, appState, prevAppState);
    const onReady = (getPuck: any) => emit("ready", getPuck);

    const collectProps = (): EditorProps => ({
      config: props.config,
      data: props.data,
      ui: props.ui,
      permissions: props.permissions,
      viewports: props.viewports,
      iframe: props.iframe,
      initialHistory: props.initialHistory,
      metadata: props.metadata,
      headerTitle: props.headerTitle,
      headerPath: props.headerPath,
      height: props.height,
      overrides: props.overrides,
      plugins: props.plugins,
      fieldTypes: props.fieldTypes,
      onChange,
      onPublish,
      onAction,
      onReady,
    });

    onMounted(() => {
      if (hostEl) host.mount(hostEl, collectProps());
    });

    // Passthrough props: reconcile in place, editor state survives.
    watch(
      () => [
        props.ui,
        props.permissions,
        props.viewports,
        props.iframe,
        props.metadata,
        props.headerTitle,
        props.headerPath,
        props.height,
        props.plugins,
        props.overrides,
        props.fieldTypes,
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
