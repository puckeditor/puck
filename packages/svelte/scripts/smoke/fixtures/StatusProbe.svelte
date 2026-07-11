<script>
  import { puckApi } from "../../../svelte/puck-api.svelte.js";

  const selected = puckApi((api) => api.selectedItem);
</script>

<div class="status">selected={selected.current ? selected.current.props.id : "none"}</div>
