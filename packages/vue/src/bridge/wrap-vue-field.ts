import {
  createVNode,
  render as vueRender,
  shallowReactive,
  defineComponent,
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
import { patchReactiveProps } from "./patch-reactive";
import { createOutlet, CHILDREN_KEY, type SlotMount, type SlotRegistry } from "./outlet";

export type WrapVueFieldOptions = {
  appContext?: AppContext | null;
};

/**
 * Wrap a Vue component so it can be used as a custom field's `render`
 * (`type: "custom"`) or a `fieldTypes` override.
 *
 * Same mount/patch bridge as `wrapVueComponent`, minus slots/dragRef/puck. The
 * field render props (`{ id, name, value, onChange, field, readOnly }`) are
 * plain data + functions and pass straight into the reactive props object;
 * `onChange` flows back unmodified. For `fieldTypes` overrides that wrap the
 * default UI, `children` (a Preact node) is bridged via a children outlet, so
 * the Vue component can render `<component :is="children" />`.
 */
export const wrapVueField = (
  VueComp: VueComponent,
  options: WrapVueFieldOptions = {}
) => {
  const { appContext = null } = options;

  const VueFieldBridge = (props: Record<string, any>) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const reactivePropsRef = useRef<Record<string, any> | null>(null);
    const mountedRef = useRef(false);

    const [mounts, setMounts] = useState<SlotMount[]>([]);
    const thunksRef = useRef<Record<string, ((dz: any) => any) | undefined>>(
      {}
    );

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
    const childrenOutletRef = useRef<VueComponent | null>(null);
    if (!childrenOutletRef.current) {
      childrenOutletRef.current = createOutlet(registryRef.current, CHILDREN_KEY);
    }

    thunksRef.current[CHILDREN_KEY] = () => props.children;

    const setHostEl = useCallback((node: HTMLDivElement | null) => {
      hostRef.current = node;
    }, []);

    const buildFieldProps = () => {
      const out: Record<string, any> = {};
      for (const key in props) {
        if (key === "children") continue;
        out[key] = props[key];
      }
      // Only fieldTypes overrides pass `children`; expose it as an outlet.
      if (props.children != null) {
        out.children = childrenOutletRef.current;
      }
      return out;
    };

    useLayoutEffect(() => {
      const hostEl = hostRef.current;
      if (!hostEl) return;

      const next = buildFieldProps();

      if (!mountedRef.current) {
        const reactive = shallowReactive(next);
        reactivePropsRef.current = reactive;

        const Wrapper = defineComponent({
          name: "PuckVueFieldBridge",
          setup() {
            return () => vueH(VueComp as any, { ...reactive });
          },
        });

        const vnode = createVNode(Wrapper);
        vnode.appContext = appContext ?? null;
        vueRender(vnode, hostEl);
        mountedRef.current = true;
      } else if (reactivePropsRef.current) {
        patchReactiveProps(reactivePropsRef.current, next);
      }
    });

    useLayoutEffect(() => {
      return () => {
        const hostEl = hostRef.current;
        if (hostEl) vueRender(null, hostEl);
        mountedRef.current = false;
        reactivePropsRef.current = null;
      };
    }, []);

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

  VueFieldBridge.displayName = `VueFieldBridge(${
    (VueComp as any)?.name || (VueComp as any)?.__name || "anonymous"
  })`;

  return VueFieldBridge;
};
