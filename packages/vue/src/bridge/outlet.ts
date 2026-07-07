import {
  defineComponent,
  h as vueH,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";

/**
 * A registered slot/DropZone outlet: a Vue-owned DOM element into which the
 * Preact bridge portals the slot's (Preact-rendered) content.
 */
export type SlotMount = {
  uid: number;
  /** Which thunk (slot prop name, or a reserved key) fills this outlet. */
  thunkKey: string;
  el: HTMLElement;
  /** DropZoneProps derived from the outlet's attrs (allow, disallow, zone…). */
  dzProps: Record<string, any>;
};

/**
 * Bridge registry: Vue outlets register their elements here; the Preact side
 * renders a portal per registered mount. Backed by Preact state so registering
 * triggers a re-render that commits the portals.
 */
export type SlotRegistry = {
  register: (mount: SlotMount) => void;
  update: (uid: number, dzProps: Record<string, any>) => void;
  unregister: (uid: number) => void;
};

let uidSeq = 0;
const nextUid = () => (uidSeq += 1);

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

/** Reserved thunk keys for non-field slots. */
export const RENDER_DROPZONE_KEY = "__puck_render_dropzone";
export const CHILDREN_KEY = "__puck_children";
