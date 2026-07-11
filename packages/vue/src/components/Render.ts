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
import { createRenderHost, type RenderProps } from "../shim";
import { transformConfig } from "../transform-config";
import type { Data, Metadata } from "../core";
import type { VueConfig } from "../types";

/**
 * Vue `<Render>` — renders published Puck data with Vue config components.
 *
 * A thin shell over the shared `createRenderHost`: it wraps core's `Render` in a
 * single host `<div>`, re-invoking the host on any prop change. `config` is
 * re-transformed only on identity change.
 */
export const Render = defineComponent({
  name: "PuckRender",
  props: {
    config: { type: Object as PropType<VueConfig>, required: true },
    data: { type: Object as PropType<Partial<Data>>, required: true },
    metadata: {
      type: Object as PropType<Metadata>,
      default: undefined,
    },
    /**
     * Override the Vue app context threaded into every bridged Vue component
     * mount. Defaults to the context of the app rendering `<Render>`; pass an
     * (unmounted) `createApp(...)` instance to substitute a different one.
     * Read once at setup.
     */
    app: { type: Object as PropType<App>, default: undefined },
  },
  setup(props) {
    let hostEl: HTMLElement | null = null;
    const setHost = (el: any) => {
      hostEl = (el as HTMLElement) ?? null;
    };

    const instance = getCurrentInstance();
    const appContext =
      (props.app as any)?._context ?? instance?.appContext ?? null;

    const host = createRenderHost({
      transformConfig: (config) => transformConfig(config, { appContext }),
    });

    const collectProps = (): RenderProps => ({
      config: props.config,
      data: props.data,
      metadata: props.metadata,
    });

    onMounted(() => {
      if (hostEl) host.mount(hostEl, collectProps());
    });

    // config / metadata by identity; data deeply — Vue users commonly hold
    // published data in a reactive() and edit it in place, so identity alone
    // would miss updates. (Deep-watching a large published document is
    // O(tree) per flush; pass a plain swapped-by-reference object if that
    // ever matters.)
    watch(() => [props.config, props.metadata], () => host.update(collectProps()));
    watch(() => props.data, () => host.update(collectProps()), { deep: true });

    onBeforeUnmount(() => host.unmount());

    return () => vueH("div", { ref: setHost });
  },
});
