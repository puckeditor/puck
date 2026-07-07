import {
  createVNode,
  render as vueRender,
  shallowReactive,
  defineComponent,
  provide,
  h as vueH,
  type AppContext,
} from "vue";
import {
  h,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  createPortal,
  Fragment,
} from "../runtime";
import type { VueComponent } from "../types";
import { buildVueProps } from "./build-vue-props";
import { patchReactiveProps } from "./patch-reactive";
import { PUCK_INJECTION_KEY } from "../composables/use-puck";
import {
  createOutlet,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
  type SlotMount,
  type SlotRegistry,
} from "./outlet";

export type WrapVueComponentOptions = {
  appContext?: AppContext | null;
  /**
   * Prop names that are slots (derived from `fields` where `type === "slot"`).
   * Bridged via the outlet/portal protocol rather than passed as plain reactive
   * props.
   */
  slotPropNames?: string[];
  /**
   * True when wrapping the config `root`. Root additionally bridges its
   * `children` (the root DropZone) through the outlet protocol.
   */
  isRoot?: boolean;
};

/**
 * Wrap a Vue component so it can be used as a Puck component's `render`.
 *
 * Per instance the returned Preact component:
 *  - renders a host `<div>` (the measured/draggable element with `inline: true`)
 *    plus a portal per registered slot/DropZone outlet;
 *  - mounts the Vue component into the host div once, inside a wrapper that
 *    provides the Puck context and whose render effect reads the reactive props
 *    (so in-place patches propagate); patches — never remounts — on updates;
 *  - bridges slots via outlets: Vue renders `<component :is="slotName" />`, the
 *    outlet registers its element, and the bridge `createPortal`s the slot's
 *    (Preact-rendered) content into it. The slot thunk is called each render so
 *    the returned element keeps a stable type (ContextSlotRender / DropZone),
 *    reconciling in place rather than remounting.
 */
export const wrapVueComponent = (
  VueComp: VueComponent,
  options: WrapVueComponentOptions = {}
) => {
  const { appContext = null, slotPropNames = [], isRoot = false } = options;

  const VueComponentBridge = (props: Record<string, any>) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const reactivePropsRef = useRef<Record<string, any> | null>(null);
    const reactivePuckRef = useRef<Record<string, any> | null>(null);
    const mountedRef = useRef(false);

    // Registered slot/DropZone outlets. Registering (from Vue's onMounted, which
    // runs inside our mount layout-effect) sets state → re-render → portals.
    const [mounts, setMounts] = useState<SlotMount[]>([]);

    // Latest thunk per key, refreshed every render. Calling a thunk returns a
    // stable-typed element, so reconciliation (not remounting) happens.
    const thunksRef = useRef<Record<string, ((dz: any) => any) | undefined>>(
      {}
    );

    // Registry + outlet components: created once (stable identity so
    // `<component :is>` never remounts).
    const registryRef = useRef<SlotRegistry | null>(null);
    if (!registryRef.current) {
      registryRef.current = {
        register: (m) => setMounts((prev) => [...prev, m]),
        update: (uid, dzProps) =>
          setMounts((prev) =>
            prev.map((m) => (m.uid === uid ? { ...m, dzProps } : m))
          ),
        unregister: (uid) =>
          setMounts((prev) => prev.filter((m) => m.uid !== uid)),
      };
    }

    const outletsRef = useRef<Record<string, VueComponent> | null>(null);
    if (!outletsRef.current) {
      const registry = registryRef.current;
      const outlets: Record<string, VueComponent> = {};
      for (const name of slotPropNames) {
        outlets[name] = createOutlet(registry, name);
      }
      outlets[RENDER_DROPZONE_KEY] = createOutlet(registry, RENDER_DROPZONE_KEY);
      if (isRoot) {
        outlets[CHILDREN_KEY] = createOutlet(registry, CHILDREN_KEY);
      }
      outletsRef.current = outlets;
    }
    const outlets = outletsRef.current;

    // Refresh thunks from the raw core props each render.
    const thunks = thunksRef.current;
    for (const name of slotPropNames) thunks[name] = props[name];
    thunks[RENDER_DROPZONE_KEY] = props.puck?.renderDropZone;
    if (isRoot) thunks[CHILDREN_KEY] = () => props.children;

    const setHostEl = useCallback((node: HTMLDivElement | null) => {
      hostRef.current = node;
    }, []);

    const buildSplit = () => {
      const split = buildVueProps(props, slotPropNames);
      // Slot props → outlet components for `<component :is="slotName" />`.
      for (const name of slotPropNames) split.props[name] = outlets[name];
      // Imperative DropZone outlet on the puck context.
      (split.puck as any).renderDropZone = outlets[RENDER_DROPZONE_KEY];
      // Root children → outlet for `<component :is="children" />`.
      if (isRoot) split.props.children = outlets[CHILDREN_KEY];
      return split;
    };

    // Mount once, then patch reactive props/context in place on every commit.
    useLayoutEffect(() => {
      const hostEl = hostRef.current;
      if (!hostEl) return;

      const split = buildSplit();

      if (!mountedRef.current) {
        const reactiveProps = shallowReactive(split.props);
        const reactivePuck = shallowReactive(
          split.puck as Record<string, any>
        );
        reactivePropsRef.current = reactiveProps;
        reactivePuckRef.current = reactivePuck;

        const Wrapper = defineComponent({
          name: "PuckVueBridge",
          setup() {
            provide(PUCK_INJECTION_KEY, reactivePuck as any);
            return () => vueH(VueComp as any, { ...reactiveProps });
          },
        });

        const vnode = createVNode(Wrapper);
        vnode.appContext = appContext ?? null;
        vueRender(vnode, hostEl);
        mountedRef.current = true;
      } else {
        if (reactivePropsRef.current) {
          patchReactiveProps(reactivePropsRef.current, split.props);
        }
        if (reactivePuckRef.current) {
          patchReactiveProps(
            reactivePuckRef.current,
            split.puck as Record<string, any>
          );
        }
      }
    });

    // Point dnd-kit's dragRef at the host div (inline: true → this is the drag
    // element), re-pointing if its identity changes.
    const dragRef = props.puck?.dragRef;
    useLayoutEffect(() => {
      if (typeof dragRef === "function") {
        dragRef(hostRef.current);
        return () => dragRef(null);
      }
    }, [dragRef]);

    // Tear down the Vue root on unmount (before Preact removes the host).
    useLayoutEffect(() => {
      return () => {
        const hostEl = hostRef.current;
        if (hostEl) vueRender(null, hostEl);
        mountedRef.current = false;
        reactivePropsRef.current = null;
        reactivePuckRef.current = null;
      };
    }, []);

    // Host div (Vue mounts here) + one portal per registered outlet.
    return h(
      Fragment,
      null,
      h("div", { ref: setHostEl }),
      ...mounts.map((m) => {
        const thunk = thunksRef.current[m.thunkKey];
        const content = thunk && m.el ? thunk(m.dzProps) : null;
        return h(
          Fragment,
          { key: m.uid },
          content && m.el ? createPortal(content, m.el) : null
        );
      })
    );
  };

  VueComponentBridge.displayName = `VueComponentBridge(${
    (VueComp as any)?.name || (VueComp as any)?.__name || "anonymous"
  })`;

  return VueComponentBridge;
};
