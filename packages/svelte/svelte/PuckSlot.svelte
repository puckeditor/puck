<script>
  import { getContext, onMount, onDestroy, untrack } from "svelte";
  import { OUTLET_CONTEXT, mapDropZoneProps } from "./context.js";

  /**
   * Renders a Puck slot field inside a bridged component. Context-based analogue
   * of Vue's `<component :is="slotName" />`: registers a `display: contents`
   * placeholder with the bridge registry under thunk key = `name`; the Preact
   * bridge portals the slot's content into it. A reactive `name` change
   * re-registers under the new key.
   */
  let { name, ...rest } = $props();
  const outlet = getContext(OUTLET_CONTEXT);

  let el;
  let handle;
  let registeredName;

  onMount(() => {
    if (outlet && el) {
      handle = outlet.registerSlot(name, el, mapDropZoneProps(rest));
      registeredName = name;
    }
  });

  $effect(() => {
    const dzProps = mapDropZoneProps(rest);
    name;
    untrack(() => {
      if (!handle) return;
      if (name !== registeredName) {
        // The thunk key changed: re-register so the portal pipes the new slot.
        handle.unregister();
        handle = outlet.registerSlot(name, el, dzProps);
        registeredName = name;
      } else {
        handle.update(dzProps);
      }
    });
  });

  onDestroy(() => handle?.unregister());
</script>

<div bind:this={el} style="display: contents"></div>
