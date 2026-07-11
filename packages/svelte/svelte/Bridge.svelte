<script>
  import { setContext } from "svelte";
  import { PUCK_CONTEXT, OUTLET_CONTEXT } from "./context.js";

  /**
   * The reactivity holder for one bridged Svelte component. The adapter mounts
   * this with static props; it creates `$state` prop/puck objects, provides the
   * puck context + outlet registry + the user's context Map, and hands in-place
   * patchers back to the adapter via `connect`. `patch` is the shim's generic
   * reconcile (assign changed keys, delete removed) — mutating the `$state`
   * proxies propagates to the mounted component, so it patches, never remounts.
   */
  let {
    comp: Comp,
    initialProps,
    initialPuck,
    outlet,
    provideContext,
    userContext,
    patch,
    connect,
  } = $props();

  // Every bridge prop is set ONCE by the adapter and never updated through
  // Svelte (prop/context changes flow via the `patch`/`connect` callbacks), so
  // reading initial values here is intentional — hence the svelte-ignore lines.

  // svelte-ignore state_referenced_locally
  let props = $state({ ...initialProps });
  // svelte-ignore state_referenced_locally
  let puck = $state(initialPuck ? { ...initialPuck } : {});

  // svelte-ignore state_referenced_locally
  if (provideContext) setContext(PUCK_CONTEXT, puck);
  // svelte-ignore state_referenced_locally
  if (outlet) setContext(OUTLET_CONTEXT, outlet);
  // svelte-ignore state_referenced_locally
  if (userContext) {
    for (const [key, value] of userContext) setContext(key, value);
  }

  // Hand the adapter in-place patchers over our reactive state, synchronously
  // during init: `mount()` runs the component body before returning, so the
  // patchers are connected by the time the adapter's mount call returns — no
  // flush needed, and no reliance on effect timing (`flushSync` is forbidden
  // inside effects on some Svelte 5.x versions, which would silently drop
  // every patch and freeze the component on its initial props).
  // svelte-ignore state_referenced_locally
  connect({
    patchProps: (next) => patch(props, next),
    patchPuck: (next) => patch(puck, next),
  });
</script>

<Comp {...props} />
