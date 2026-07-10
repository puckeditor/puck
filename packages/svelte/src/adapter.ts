import { mount, unmount, flushSync } from "svelte";
// The ONE `.svelte` import in the compiled layer, kept external (see
// tsup config): the host app's vite-plugin-svelte compiles it.
import Bridge from "../svelte/Bridge.svelte";
import {
  patchProps,
  nextUid,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
  type FrameworkAdapter,
  type Split,
  type SlotRegistry,
  type MountedInstance,
} from "@puckeditor/framework-shim";

/** Patch callbacks Bridge.svelte hands back through its `connect` prop. */
type Patchers = {
  patchProps: (next: Record<string, any>) => void;
  patchPuck: (next: Record<string, any>) => void;
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
 * The Svelte `FrameworkAdapter`: the only Svelte-bound bridging the shared shim
 * needs. It mounts `Bridge.svelte` (which owns all runes reactivity) with static
 * props; `Bridge` hands back in-place patchers via `connect`, so `patch()` is
 * just a call. `flushSync()` after `mount` forces Svelte's effects (incl. outlet
 * `onMount` registration) to run synchronously inside the shim's Preact
 * layout-effect, so slot outlets land pre-paint — matching Vue's timing.
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
  ): { instance: any; patchers: Patchers | null } => {
    let patchers: Patchers | null = null;
    const instance = mount(Bridge, {
      target: el,
      props: {
        ...props,
        userContext,
        patch: patchProps,
        connect: (p: Patchers) => {
          patchers = p;
        },
      },
    });
    // Force onMount/effects (outlet registration) to run now, pre-paint.
    flushSync();
    return { instance, patchers };
  };

  return {
    // No createOutlet / decorateComponentSplit: Svelte slots are context-based
    // (<PuckSlot>), so nothing is injected into props.

    mountComponent: ({ el, comp, split, registry }): MountedInstance => {
      const { instance, patchers } = mountBridge(el, {
        comp,
        initialProps: split.props,
        initialPuck: split.puck,
        outlet: makeOutletApi(registry),
        provideContext: true,
      });
      return {
        patch: (next: Split) => {
          patchers?.patchProps(next.props);
          patchers?.patchPuck(next.puck as Record<string, any>);
        },
        unmount: () => unmount(instance),
      };
    },

    mountField: ({ el, comp, props, registry }): MountedInstance => {
      const { instance, patchers } = mountBridge(el, {
        comp,
        initialProps: props,
        initialPuck: undefined,
        outlet: makeOutletApi(registry),
        provideContext: false,
      });
      return {
        patch: (next: Record<string, any>) => patchers?.patchProps(next),
        unmount: () => unmount(instance),
      };
    },
  };
};
