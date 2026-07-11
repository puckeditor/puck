<script lang="ts">
  import { Puck } from "@puckeditor/svelte";
  import "@puckeditor/svelte/puck.css";
  import { config, initialData } from "../puck.config";

  const KEY = "puck-svelte-recipe";
  const data = JSON.parse(localStorage.getItem(KEY) || "null") || initialData;

  function onpublish(next: unknown) {
    localStorage.setItem(KEY, JSON.stringify(next));
    location.assign("/");
  }
</script>

<div style="height: 100vh">
  <Puck {config} {data} {onpublish} />
</div>
