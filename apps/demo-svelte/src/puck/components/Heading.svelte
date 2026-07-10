<script>
  // Plain props — the simplest bridged component.
  let { title = "" } = $props();
</script>

<h1 class="heading">{title}</h1>

<style>
  .heading {
    margin: 0;
    padding: 24px;
    font-size: 2rem;
  }
</style>
