<script>
  import { Puck } from "@puckeditor/svelte";
  import "@puckeditor/svelte/puck.css";
  import { config } from "../puck/config";
  import { loadData, saveData } from "../puck/data";
  import { counterStore, COUNTER_KEY } from "../store.svelte";

  // A Map of app-level context, threaded into every bridged Svelte mount so
  // CounterBadge can read the store (analogue of demo-vue's `app` prop).
  const context = new Map([[COUNTER_KEY, counterStore]]);
  const initialData = loadData();

  const onchange = (data) => saveData(data);
  const onpublish = (data) => {
    saveData(data);
    location.href = "/";
  };
  const onready = (getPuck) => {
    // The imperative PuckApi accessor.
    window.__getPuck = getPuck;
  };
</script>

<div class="editor">
  <Puck
    {config}
    data={initialData}
    {context}
    headerTitle="Puck + Svelte demo"
    {onchange}
    {onpublish}
    {onready}
  />
</div>

<style>
  .editor {
    height: 100vh;
  }
</style>
