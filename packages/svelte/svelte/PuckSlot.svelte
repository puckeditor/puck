<script>
  import { getContext, onMount, onDestroy } from "svelte";
  import { OUTLET_CONTEXT, mapDropZoneProps } from "./context.js";

  /**
   * Renders a Puck slot field inside a bridged component. Context-based analogue
   * of Vue's `<component :is="slotName" />`: registers a `display: contents`
   * placeholder with the bridge registry under thunk key = `name`; the Preact
   * bridge portals the slot's content into it.
   */
  let { name, ...rest } = $props();
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;

  onMount(() => {
    if (outlet && el) handle = outlet.registerSlot(name, el, mapDropZoneProps(rest));
  });

  $effect(() => {
    const dzProps = mapDropZoneProps(rest);
    if (handle) handle.update(dzProps);
  });

  onDestroy(() => handle?.unregister());
</script>

<div bind:this={el} style="display: contents"></div>
