<script>
  // `items` is a slot field. Instead of a prop, render it with <PuckSlot name>;
  // Puck portals the (editable) DropZone into the placeholder.
  import { PuckSlot } from "@puckeditor/svelte";

  let { columns = 2 } = $props();
</script>

<div
  class="columns"
  style="grid-template-columns: repeat({columns || 2}, 1fr)"
>
  <PuckSlot name="items" class="columns-slot" />
</div>

<style>
  .columns {
    display: grid;
    gap: 12px;
    padding: 12px;
  }
</style>
