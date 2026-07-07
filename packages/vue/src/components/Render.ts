import {
  defineComponent,
  h as vueH,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
  type App,
} from "vue";
import { h, render as preactRender } from "../runtime";
import { Render as CoreRender } from "../core";
import { transformConfig } from "../transform-config";
import type { VueConfig } from "../types";

/**
 * Vue `<Render>` — renders published Puck data with Vue config components.
 *
 * Stateless: it re-invokes the Preact render on any prop change. Wrapping core's
 * (React/Preact-compiled) `Render` in a single host `<div>`, it mounts once on
 * `onMounted` and tears the Preact tree down on unmount (which unmounts every
 * embedded Vue root).
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

    // config identity change ⇒ re-transform. Everything else re-renders freely.
    let transformed = transformConfig(props.config, { appContext });
    let lastConfig = props.config;

    const renderInto = () => {
      if (!hostEl) return;
      if (props.config !== lastConfig) {
        transformed = transformConfig(props.config, { appContext });
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

    onMounted(renderInto);

    // config / metadata by identity; data deeply (published data usually swaps
    // by reference, but deep-watch keeps in-place edits correct too).
    watch(() => props.config, renderInto);
    watch(() => props.metadata, renderInto, { deep: true });
    watch(() => props.data, renderInto, { deep: true });

    onBeforeUnmount(() => {
      if (hostEl) preactRender(null, hostEl);
    });

    return () => vueH("div", { ref: setHost });
  },
});
