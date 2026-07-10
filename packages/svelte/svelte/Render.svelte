<script>
  import { onMount, onDestroy, untrack } from "svelte";
  import { createRenderHost, transformConfig } from "../dist/index.js";

  /**
   * Svelte `<Render>` — renders published Puck data with Svelte config
   * components. A thin shell over the shared `createRenderHost`: it wraps core's
   * `Render` in a single host `<div>`, re-invoking the host on any prop change.
   * `config` is re-transformed only on identity change.
   */
  let { config, data, metadata, context = null } = $props();

  let hostEl;
  let mounted = false;

  const host = createRenderHost({
    transformConfig: (cfg) => transformConfig(cfg, { context }),
  });

  const collect = () => ({ config, data, metadata });

  onMount(() => {
    host.mount(hostEl, collect());
    mounted = true;
  });

  $effect(() => {
    config;
    data;
    metadata;
    if (mounted) untrack(() => host.update(collect()));
  });

  onDestroy(() => host.unmount());
</script>

<div bind:this={hostEl}></div>
