import { mount, unmount, flushSync } from "svelte";
import {
  patchProps,
  nextUid,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
  type FrameworkAdapter,
  type Split,
  type SlotRegistry,
  type MountedInstance,
} from "./shim";

/** Patch callbacks Bridge.svelte hands back through its `connect` prop. */
type Patchers = {
  patchProps: (next: Record<string, any>) => void;
  patchPuck: (next: Record<string, any>) => void;
};

/**
 * `Bridge.svelte`, registered by the source layer (`svelte/index.js`) at
 * import time. The compiled layer must never import `.svelte` files itself:
 * its module graph is evaluated in plain node by server-side consumers of the
 * framework-agnostic utilities (migrate, resolveAllData, …), where a `.svelte`
 * import throws `ERR_UNKNOWN_FILE_EXTENSION`. Anything that can mount
 * components (`<Puck>`/`<Render>`) lives in the source layer, so the bridge is
 * always registered before it's needed.
 */
let Bridge: any = null;

export const registerBridge = (component: unknown) => {
  Bridge = component;
};

/**
 * The register helpers Bridge.svelte exposes via context so `<PuckSlot>` /
 * `<PuckDropZone>` / `<PuckChildren>` can register their DOM element with the
 * bridge-owned registry under the right reserved thunk key — the Svelte analogue
 * of Vue's `<component :is>` outlet, but context-based. Owns the shim's reserved
 * keys so the source layer never has to duplicate them.
 */
const makeOutletApi = (registry: SlotRegistry) => {
  const registerWithKey = (
    thunkKey: string,
    el: HTMLElement,
    dzProps: Record<string, any>
  ) => {
    const uid = nextUid();
    registry.register({ uid, thunkKey, el, dzProps });
    return {
      update: (dz: Record<string, any>) => registry.update(uid, dz),
      unregister: () => registry.unregister(uid),
    };
  };
  return {
    registerSlot: (name: string, el: HTMLElement, dz: Record<string, any>) =>
      registerWithKey(name, el, dz),
    registerDropZone: (el: HTMLElement, dz: Record<string, any>) =>
      registerWithKey(RENDER_DROPZONE_KEY, el, dz),
    registerChildren: (el: HTMLElement, dz: Record<string, any>) =>
      registerWithKey(CHILDREN_KEY, el, dz ?? {}),
  };
};

/**
 * A live connection to a mounted Bridge. `Bridge.svelte` connects its patchers
 * synchronously during `mount()`; if a patch ever arrives before then (it
 * shouldn't), it's queued and applied on connect rather than silently dropped —
 * a dropped patch freezes the component on its initial props.
 */
type Connection = {
  patchers: Patchers | null;
  pendingProps: Record<string, any> | null;
  pendingPuck: Record<string, any> | null;
};

/**
 * The Svelte `FrameworkAdapter`: the only Svelte-bound bridging the shared shim
 * needs. It mounts `Bridge.svelte` (which owns all runes reactivity) with static
 * props; `Bridge` hands back in-place patchers via `connect` synchronously
 * during `mount()`, so `patch()` is just a call.
 *
 * After mount, `flushSync()` runs Svelte's effects (incl. `<PuckSlot>`'s
 * registration) synchronously inside the shim's Preact layout-effect, so slot
 * outlets land pre-paint — matching Vue's timing. Some Svelte 5.x versions
 * forbid `flushSync` inside an outer effect (`flush_sync_in_effect`); in that
 * case effects flush on the following microtask instead, which is still
 * pre-paint — so the call is best-effort.
 *
 * `userContext` (a Map, the analogue of Vue's `app` prop) is threaded into every
 * bridged component via `setContext`.
 */
export const makeSvelteAdapter = (
  userContext: Map<any, any> | null = null
): FrameworkAdapter => {
  const mountBridge = (
    el: HTMLElement,
    props: Record<string, any>
  ): { instance: any; conn: Connection } => {
    if (!Bridge) {
      throw new Error(
        "@puckeditor/svelte: Bridge.svelte is not registered. Import the " +
          "package via its Svelte entry (the `svelte` export condition) — " +
          "e.g. `import { Puck } from \"@puckeditor/svelte\"` in a Svelte app."
      );
    }
    const conn: Connection = {
      patchers: null,
      pendingProps: null,
      pendingPuck: null,
    };
    const instance = mount(Bridge, {
      target: el,
      props: {
        ...props,
        userContext,
        patch: patchProps,
        connect: (p: Patchers) => {
          conn.patchers = p;
          if (conn.pendingProps) p.patchProps(conn.pendingProps);
          if (conn.pendingPuck) p.patchPuck(conn.pendingPuck);
          conn.pendingProps = null;
          conn.pendingPuck = null;
        },
      },
    });
    // Best-effort pre-paint effect flush (see docblock).
    try {
      flushSync();
    } catch {
      /* flush_sync_in_effect: effects run on the next microtask instead */
    }
    return { instance, conn };
  };

  const patchThrough = (
    conn: Connection,
    props: Record<string, any>,
    puck: Record<string, any> | null
  ) => {
    if (conn.patchers) {
      conn.patchers.patchProps(props);
      if (puck) conn.patchers.patchPuck(puck);
    } else {
      conn.pendingProps = props;
      if (puck) conn.pendingPuck = puck;
    }
  };

  return {
    // No createOutlet / decorateComponentSplit: Svelte slots are context-based
    // (<PuckSlot>), so nothing is injected into props.

    mountComponent: ({ el, comp, split, registry }): MountedInstance => {
      const { instance, conn } = mountBridge(el, {
        comp,
        initialProps: split.props,
        initialPuck: split.puck,
        outlet: makeOutletApi(registry),
        provideContext: true,
      });
      return {
        patch: (next: Split) =>
          patchThrough(conn, next.props, next.puck as Record<string, any>),
        unmount: () => unmount(instance),
      };
    },

    mountField: ({ el, comp, props, registry, storeApi }): MountedInstance => {
      const { instance, conn } = mountBridge(el, {
        comp,
        initialProps: props,
        // Minimal puck context for field UIs: fields only render inside
        // <Puck>, and `storeApi` powers `puckApi()` from custom fields.
        initialPuck: {
          isEditing: true,
          metadata: {},
          ...(storeApi ? { storeApi } : {}),
        },
        outlet: makeOutletApi(registry),
        provideContext: true,
      });
      return {
        patch: (next: Record<string, any>) => patchThrough(conn, next, null),
        unmount: () => unmount(instance),
      };
    },
  };
};
