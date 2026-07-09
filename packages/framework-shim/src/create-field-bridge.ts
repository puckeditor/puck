import {
  h,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  Fragment,
} from "./runtime";
import {
  createSlotRegistry,
  CHILDREN_KEY,
  type SlotMount,
  type SlotRegistry,
} from "./registry";
import { renderOutletPortals } from "./outlet-portals";
import type { FrameworkAdapter, MountedInstance } from "./adapter";

/**
 * Wrap a framework component so it can be used as a custom field's `render`
 * (`type: "custom"`) or a `fieldTypes` override.
 *
 * Same mount/patch bridge as `createComponentBridge`, minus slots/dragRef/puck.
 * `{ id, name, value, onChange, field, readOnly }` pass through as plain props.
 * For `fieldTypes` overrides that wrap the default UI, `children` (a Preact
 * node) is bridged via a children outlet.
 */
export const createFieldBridge = (adapter: FrameworkAdapter, comp: unknown) => {
  const FieldBridge = (props: Record<string, any>) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const instanceRef = useRef<MountedInstance | null>(null);
    const mountedRef = useRef(false);

    const [mounts, setMounts] = useState<SlotMount[]>([]);
    const thunksRef = useRef<Record<string, ((dz: any) => any) | undefined>>(
      {}
    );

    const registryRef = useRef<SlotRegistry | null>(null);
    if (!registryRef.current) {
      registryRef.current = createSlotRegistry(setMounts);
    }
    const registry = registryRef.current;

    const childrenOutletRef = useRef<unknown>(null);
    if (childrenOutletRef.current == null && adapter.createOutlet) {
      childrenOutletRef.current = adapter.createOutlet(registry, CHILDREN_KEY);
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
      adapter.decorateFieldProps?.(out, {
        outlet: childrenOutletRef.current,
        hasChildren: props.children != null,
      });
      return out;
    };

    useLayoutEffect(() => {
      const hostEl = hostRef.current;
      if (!hostEl) return;

      const next = buildFieldProps();

      if (!mountedRef.current) {
        instanceRef.current = adapter.mountField({
          el: hostEl,
          comp,
          props: next,
          registry,
        });
        mountedRef.current = true;
      } else {
        instanceRef.current?.patch(next);
      }
    });

    useLayoutEffect(() => {
      return () => {
        instanceRef.current?.unmount();
        instanceRef.current = null;
        mountedRef.current = false;
      };
    }, []);

    return h(
      Fragment,
      null,
      h("div", { ref: setHostEl }),
      ...renderOutletPortals(mounts, thunksRef.current)
    );
  };

  FieldBridge.displayName = `FieldBridge(${
    (comp as any)?.name || (comp as any)?.__name || "anonymous"
  })`;

  return FieldBridge;
};
