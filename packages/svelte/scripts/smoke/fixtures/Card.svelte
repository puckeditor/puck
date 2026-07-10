<script module>
  // Module-scoped: increments once per real mount, so a value derived from it
  // proves the component patched (script did NOT re-run) vs remounted.
  let counter = 0;
</script>

<script>
  import { getPuck } from "../../../svelte/context.js";

  let { label = "" } = $props();
  const puck = getPuck();
  const localState = `local#${++counter}`;
</script>

<div class="card">label={label} state={localState} editing={puck.isEditing}</div>
