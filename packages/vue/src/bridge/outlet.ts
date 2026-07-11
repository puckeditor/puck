import {
  defineComponent,
  h as vueH,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import {
  nextUid,
  mapDropZoneProps,
  type SlotRegistry,
} from "../shim";

/**
 * Create a Vue outlet component bound to a registry + thunk key. Rendered by
 * Vue users via `<component :is="slotName" />` (or `<component
 * :is="puck.renderDropZone" zone="…" />`). It renders a layout-neutral
 * `display: contents` placeholder div and registers that div with the bridge on
 * mount; the bridge portals the slot content into it. The component identity is
 * stable (cached per bridge instance), so `<component :is>` never remounts.
 */
export const createOutlet = (registry: SlotRegistry, thunkKey: string) =>
  defineComponent({
    name: `PuckOutlet(${thunkKey})`,
    inheritAttrs: false,
    setup(_props, { attrs }) {
      const uid = nextUid();
      const elRef = ref<HTMLElement | null>(null);

      onMounted(() => {
        if (elRef.value) {
          registry.register({
            uid,
            thunkKey,
            el: elRef.value,
            dzProps: mapDropZoneProps(attrs),
          });
        }
      });

      // Shallow: dzProps are flat scalar-ish attrs (allow/disallow/zone/...);
      // the spread getter re-runs whenever any attr changes.
      watch(
        () => ({ ...attrs }),
        () => registry.update(uid, mapDropZoneProps(attrs))
      );

      onUnmounted(() => registry.unregister(uid));

      return () => vueH("div", { ref: elRef, style: { display: "contents" } });
    },
  });
