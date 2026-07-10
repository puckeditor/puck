<script>
  import { getContext, onMount, onDestroy } from "svelte";
  import { OUTLET_CONTEXT } from "./context.js";

  /**
   * Renders the root DropZone (a custom `root` component's children) or the
   * default field UI inside a `fieldTypes` override. Registers under the
   * reserved children thunk key.
   */
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;

  onMount(() => {
    if (outlet && el) handle = outlet.registerChildren(el, {});
  });

  onDestroy(() => handle?.unregister());
</script>

<div bind:this={el} style="display: contents"></div>
