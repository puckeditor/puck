import {
  defineComponent,
  h as vueH,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
  type App,
} from "vue";
import { h, render as preactRender, Fragment } from "../runtime";
import { Puck as CorePuck } from "../core";
import { transformConfig, transformFieldTypes } from "../transform-config";
import { ReadyBridge } from "../bridge/ready-bridge";
import type { VueConfig, VueComponent } from "../types";

/**
 * Vue `<Puck>` — the full Puck editor, driven by a Vue config.
 *
 * Renders one host `<div>` and, on mount, renders core's (preact-compiled)
 * `Puck` into it. Passthrough prop changes re-invoke the Preact render with the
 * SAME component identity on the SAME container, so Preact reconciles in place
 * and editor state survives. `data` is initial-only (matches React `<Puck>`).
 * A `config` identity change is a documented full remount.
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

    // Callbacks created once with stable identity (Puck resubscribes on
    // identity change, so a fresh closure per render would thrash).
    const onChange = (data: any) => emit("change", data);
    const onPublish = (data: any) => emit("publish", data);
    const onAction = (action: any, appState: any, prevAppState: any) =>
      emit("action", action, appState, prevAppState);
    const onReady = (getPuck: any) => emit("ready", getPuck);

    let transformed = transformConfig(props.config, { appContext });

    // Inject the ready bridge via `overrides.puck`, which receives the default
    // editor layout as `children` — so we augment (not replace) the editor and
    // stay inside the Puck store context. Composes with a user override.
    const buildOverrides = () => {
      const userOverrides = { ...(props.overrides ?? {}) } as Record<string, any>;
      const userPuck = userOverrides.puck;

      // Vue fieldTypes → overrides.fieldTypes (composed with any user-provided).
      if (props.fieldTypes) {
        userOverrides.fieldTypes = {
          ...transformFieldTypes(props.fieldTypes, { appContext }),
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
        data: props.data, // initial-only; core ignores later values
        ui: props.ui,
        permissions: props.permissions,
        viewports: props.viewports,
        iframe: props.iframe,
        initialHistory: props.initialHistory,
        metadata: props.metadata,
        headerTitle: props.headerTitle,
        headerPath: props.headerPath,
        height: props.height,
        plugins: props.plugins,
        overrides: buildOverrides(),
        onChange,
        onPublish,
        onAction,
      });

    const renderPuck = () => {
      if (hostEl) preactRender(buildVnode(), hostEl);
    };

    onMounted(renderPuck);

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
      renderPuck
    );

    // config identity change ⇒ documented full remount.
    watch(
      () => props.config,
      () => {
        if (hostEl) preactRender(null, hostEl);
        transformed = transformConfig(props.config, { appContext });
        renderPuck();
      }
    );

    onBeforeUnmount(() => {
      // Tearing down the Preact tree runs its cleanups, which unmount every
      // embedded Vue root.
      if (hostEl) preactRender(null, hostEl);
    });

    return () => vueH("div", { ref: setHost });
  },
});
