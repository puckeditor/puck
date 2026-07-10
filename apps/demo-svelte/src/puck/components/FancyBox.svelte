<script>
  // Uses `<style>` (scoped by Svelte). Vite injects the CSS into the document
  // head; AutoFrame mirrors head styles into the editor iframe, so this renders
  // styled in the preview. `color` is edited via a custom Svelte field and
  // applied inline.
  let { text = "", color = "#7c3aed" } = $props();
</script>

<div class="fancy-box" style="border-color: {color}">
  <span class="fancy-text" style="color: {color}">{text}</span>
</div>

<style>
  .fancy-box {
    border: 3px solid;
    border-radius: 12px;
    padding: 20px;
    margin: 12px;
    text-align: center;
  }
  .fancy-text {
    font-weight: 700;
    font-size: 1.25rem;
  }
</style>
