import {
  defineComponent,
  h as vueH,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import { nextUid, type SlotRegistry } from "@puckeditor/framework-shim";

/**
 * Map a Vue outlet's attrs to core `DropZoneProps`. Vue's `class` → React's
 * `className`; everything else (allow, disallow, zone, minEmptyHeight,
 * collisionAxis, style, …) passes through.
 */
const mapAttrsToDzProps = (attrs: Record<string, any>): Record<string, any> => {
  const { class: className, ...rest } = attrs;
  const dzProps: Record<string, any> = { ...rest };
  if (className != null) dzProps.className = className;
  return dzProps;
};

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
            dzProps: mapAttrsToDzProps(attrs),
          });
        }
      });

      watch(
        () => ({ ...attrs }),
        () => registry.update(uid, mapAttrsToDzProps(attrs)),
        { deep: true }
      );

      onUnmounted(() => registry.unregister(uid));

      return () => vueH("div", { ref: elRef, style: { display: "contents" } });
    },
  });
