<script>
  // `title` is a contentEditable text field. Core swaps its value for an inline
  // editor element in the editor (a plain string in <Render>), so render it via
  // <PuckText>, which bridges the value in.
  import { PuckText } from "@puckeditor/svelte";
</script>

<h1 class="heading"><PuckText name="title" /></h1>

<style>
  .heading {
    margin: 0;
    padding: 24px;
    font-size: 2rem;
  }
</style>
