import {
  defineComponent,
  h as vueH,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
  type App,
} from "vue";
import { createRenderHost, type RenderProps } from "@puckeditor/framework-shim";
import { transformConfig } from "../transform-config";
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
    data: { type: Object as PropType<Record<string, any>>, required: true },
    metadata: {
      type: Object as PropType<Record<string, any>>,
      default: undefined,
    },
    /**
     * An (unmounted) Vue app instance whose context (plugins / provides) is
     * threaded into every bridged Vue component mount.
     */
    app: { type: Object as PropType<App>, default: undefined },
  },
  setup(props) {
    let hostEl: HTMLElement | null = null;
    const setHost = (el: any) => {
      hostEl = (el as HTMLElement) ?? null;
    };

    const appContext = (props.app as any)?._context ?? null;

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

    // config / metadata by identity; data deeply (published data usually swaps
    // by reference, but deep-watch keeps in-place edits correct too).
    watch(() => props.config, () => host.update(collectProps()));
    watch(() => props.metadata, () => host.update(collectProps()), {
      deep: true,
    });
    watch(() => props.data, () => host.update(collectProps()), { deep: true });

    onBeforeUnmount(() => host.unmount());

    return () => vueH("div", { ref: setHost });
  },
});
