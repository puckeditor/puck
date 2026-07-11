<script lang="ts">
  import { Render } from "@puckeditor/svelte";
  import "@puckeditor/svelte/puck.css";
  import { config, initialData } from "../puck.config";

  const KEY = "puck-svelte-recipe";
  const data = JSON.parse(localStorage.getItem(KEY) || "null") || initialData;
</script>

<div>
  <nav style="padding: 12px 24px; border-bottom: 1px solid #eee">
    <a href="/edit">Edit this page →</a>
  </nav>
  <Render {config} {data} />
</div>
