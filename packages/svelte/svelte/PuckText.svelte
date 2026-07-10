<script>
  import { getContext, onMount, onDestroy } from "svelte";
  import { OUTLET_CONTEXT } from "./context.js";

  /**
   * Renders a `contentEditable` text/textarea field inline. Same registry/portal
   * protocol as `<PuckSlot>`: registers a `display: contents` placeholder under
   * thunk key = `name`; the Preact bridge portals the field's value into it —
   * an inline-editable element in the editor, plain text in `<Render>`.
   */
  let { name } = $props();
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;

  onMount(() => {
    if (outlet && el) handle = outlet.registerSlot(name, el, {});
  });

  onDestroy(() => handle?.unregister());
</script>

<span bind:this={el} style="display: contents"></span>
