<script>
  import { getContext, onMount, onDestroy } from "svelte";
  import { OUTLET_CONTEXT } from "./context.js";

  /**
   * Renders a node-valued text field inline — `contentEditable`
   * text/textarea/custom, or `richtext`. Same registry/portal protocol as
   * `<PuckSlot>`: registers a `display: contents` placeholder under thunk key
   * = `name`; the Preact bridge portals the field's value into it — an
   * editable element in the editor, static content in `<Render>`. A reactive
   * `name` change re-registers under the new key.
   */
  let { name } = $props();
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;
  let registeredName;

  onMount(() => {
    if (outlet && el) {
      handle = outlet.registerSlot(name, el, {});
      registeredName = name;
    }
  });

  $effect(() => {
    if (handle && name !== registeredName) {
      handle.unregister();
      handle = outlet.registerSlot(name, el, {});
      registeredName = name;
    }
  });

  onDestroy(() => handle?.unregister());
</script>

<span bind:this={el} style="display: contents"></span>
