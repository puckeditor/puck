<script>
  import { getContext, onMount, onDestroy } from "svelte";
  import { OUTLET_CONTEXT, mapDropZoneProps } from "./context.js";

  /**
   * An imperative DropZone (`<PuckDropZone zone="…" />`), the Svelte analogue of
   * `puck.renderDropZone`. Registers under the reserved render-dropzone thunk
   * key with its `zone`/allow/disallow props.
   */
  let props = $props();
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;

  onMount(() => {
    if (outlet && el) handle = outlet.registerDropZone(el, mapDropZoneProps(props));
  });

  $effect(() => {
    const dzProps = mapDropZoneProps(props);
    if (handle) handle.update(dzProps);
  });

  onDestroy(() => handle?.unregister());
</script>

<div bind:this={el} style="display: contents"></div>
