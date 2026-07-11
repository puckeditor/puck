import {
  h,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  useContext,
  Fragment,
} from "./runtime";
import { UsePuckStoreContext } from "./core";
import { splitProps, type Split } from "./split-props";
import {
  createSlotRegistry,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
  type SlotMount,
  type SlotRegistry,
} from "./registry";
import { renderOutletPortals } from "./outlet-portals";
import type { FrameworkAdapter, MountedInstance } from "./adapter";

export type CreateComponentBridgeOptions = {
  /**
   * Prop names that are slots (derived from `fields` where `type === "slot"`).
   * Bridged via the outlet/portal protocol rather than passed as plain props.
   */
  slotPropNames?: string[];
  /**
   * True when wrapping the config `root`. Root additionally bridges its
   * `children` (the root DropZone) through the outlet protocol.
   */
  isRoot?: boolean;
};

/**
 * Wrap a framework component so it can be used as a Puck component's `render`.
 * Framework-agnostic; the ~framework-bound bits (mount/patch/unmount, minting
 * outlets, threading outlets into props) are delegated to `adapter`.
 *
 * Per instance the returned Preact component:
 *  - renders a host `<div>` (the measured/draggable element with `inline: true`)
 *    plus a portal per registered slot/DropZone outlet;
 *  - mounts the framework component into the host div once (via the adapter),
 *    then patches — never remounts — on updates;
 *  - bridges slots via outlets: the framework registers an outlet element, and
 *    the bridge `createPortal`s the slot's (Preact-rendered) content into it.
 */
export const createComponentBridge = (
  adapter: FrameworkAdapter,
  comp: unknown,
  options: CreateComponentBridgeOptions = {}
) => {
  const { slotPropNames = [], isRoot = false } = options;

  const ComponentBridge = (props: Record<string, any>) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const instanceRef = useRef<MountedInstance | null>(null);
    const mountedRef = useRef(false);

    // Registered slot/DropZone outlets. Registering (which happens as the
    // framework mounts, inside our mount layout-effect) sets state → re-render
    // → portals.
    const [mounts, setMounts] = useState<SlotMount[]>([]);

    // Latest thunk per key, refreshed every render. Calling a thunk returns a
    // stable-typed element, so reconciliation (not remounting) happens.
    const thunksRef = useRef<Record<string, ((dz: any) => any) | undefined>>(
      {}
    );

    // Registry: created once (stable identity).
    const registryRef = useRef<SlotRegistry | null>(null);
    if (!registryRef.current) {
      registryRef.current = createSlotRegistry(setMounts);
    }
    const registry = registryRef.current;

    // Outlets: created once per bridge instance (stable identity so the
    // framework never remounts them). Only adapters that mint outlet components
    // (Vue) populate this; context-based adapters (Svelte) leave it empty and
    // read the registry from context instead.
    const outletsRef = useRef<Record<string, unknown> | null>(null);
    if (!outletsRef.current) {
      const outlets: Record<string, unknown> = {};
      if (adapter.createOutlet) {
        for (const name of slotPropNames)
          outlets[name] = adapter.createOutlet(registry, name);
        outlets[RENDER_DROPZONE_KEY] = adapter.createOutlet(
          registry,
          RENDER_DROPZONE_KEY
        );
        if (isRoot) {
          outlets[CHILDREN_KEY] = adapter.createOutlet(registry, CHILDREN_KEY);
        }
      }
      outletsRef.current = outlets;
    }
    const outlets = outletsRef.current;

    // Refresh thunks from the raw core props each render. Slot fields arrive as
    // a render function (called with dzProps); contentEditable text fields
    // arrive as a value (an <InlineTextField> Preact element in the editor, a
    // plain string in <Render>) — wrap those so the portal renders the value.
    const thunks = thunksRef.current;
    for (const name of slotPropNames) {
      const value = props[name];
      thunks[name] = typeof value === "function" ? value : () => value;
    }
    thunks[RENDER_DROPZONE_KEY] = props.puck?.renderDropZone;
    if (isRoot) thunks[CHILDREN_KEY] = () => props.children;

    const setHostEl = useCallback((node: HTMLDivElement | null) => {
      hostRef.current = node;
    }, []);

    // The editor's PuckApi store — present inside <Puck>, null in <Render>.
    // Threaded into the puck context so framework reactive accessors (Vue
    // usePuckApi, Svelte puckApi) can getState/subscribe.
    const storeApi = useContext(UsePuckStoreContext as any);

    const buildSplit = (): Split => {
      const split = splitProps(props, slotPropNames);
      if (storeApi) split.puck.storeApi = storeApi;
      adapter.decorateComponentSplit?.(split, {
        outlets,
        slotPropNames,
        isRoot,
      });
      return split;
    };

    // Mount once, then patch props/context in place on every commit.
    useLayoutEffect(() => {
      const hostEl = hostRef.current;
      if (!hostEl) return;

      const split = buildSplit();

      if (!mountedRef.current) {
        instanceRef.current = adapter.mountComponent({
          el: hostEl,
          comp,
          split,
          registry,
          slotPropNames,
          isRoot,
        });
        mountedRef.current = true;
      } else {
        instanceRef.current?.patch(split);
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

    // Tear down the framework root on unmount (before Preact removes the host).
    useLayoutEffect(() => {
      return () => {
        instanceRef.current?.unmount();
        instanceRef.current = null;
        mountedRef.current = false;
      };
    }, []);

    // Host div (framework mounts here) + one portal per registered outlet.
    return h(
      Fragment,
      null,
      h("div", { ref: setHostEl }),
      ...renderOutletPortals(mounts, thunksRef.current)
    );
  };

  ComponentBridge.displayName = `ComponentBridge(${
    (comp as any)?.name || (comp as any)?.__name || "anonymous"
  })`;

  return ComponentBridge;
};
