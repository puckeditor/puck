<script>
  import { getPuck } from "../../../svelte/context.js";

  const puck = getPuck();
</script>

<div class="meta-card">tag={puck.metadata?.tag ?? "none"}</div>
