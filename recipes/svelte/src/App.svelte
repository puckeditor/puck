<script lang="ts">
  import Editor from "./pages/Editor.svelte";
  import Page from "./pages/Page.svelte";

  // Minimal path router: each route is a full page load. Swap for your
  // router of choice (or SvelteKit) in a real app.
  const path = typeof location !== "undefined" ? location.pathname : "/";
</script>

{#if path === "/edit"}
  <Editor />
{:else}
  <Page />
{/if}
