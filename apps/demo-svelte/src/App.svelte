<script>
  import EditPage from "./pages/EditPage.svelte";
  import ViewPage from "./pages/ViewPage.svelte";

  // Minimal path router: each route is a full page load (matches the e2e).
  const path = typeof location !== "undefined" ? location.pathname : "/";
</script>

{#if path === "/edit"}
  <EditPage />
{:else}
  <ViewPage />
{/if}
