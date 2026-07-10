<script>
  import { Render } from "@puckeditor/svelte";
  import "@puckeditor/svelte/puck.css";
  import { config } from "../puck/config";
  import { loadData } from "../puck/data";
  import { counterStore, COUNTER_KEY } from "../store.svelte";

  const context = new Map([[COUNTER_KEY, counterStore]]);
  const data = loadData();
</script>

<div class="view">
  <nav class="view-nav">
    <strong>Published page</strong>
    <a href="/edit">Open editor →</a>
  </nav>
  <Render {config} {data} {context} />
</div>

<style>
  .view-nav {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid #e2e8f0;
  }
</style>
