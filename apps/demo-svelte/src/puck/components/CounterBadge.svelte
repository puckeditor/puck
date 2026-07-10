<script>
  // Reads the app-level runes store, resolved via Svelte context. Works because
  // <Puck>/<Render> receive the `context` prop (a Map), whose entries the bridge
  // threads into every mount via setContext.
  import { getContext } from "svelte";
  import { COUNTER_KEY } from "../../store.svelte";

  const counter = getContext(COUNTER_KEY);
</script>

<div class="counter-badge">
  <span>Store count: <strong>{counter.count}</strong></span>
  <button type="button" onclick={() => counter.increment()}>+1</button>
</div>

<style>
  .counter-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: 12px;
    background: #f1f5f9;
    border-radius: 999px;
  }
  .counter-badge button {
    cursor: pointer;
  }
</style>
