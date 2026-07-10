<script>
  // Test harness component: owns `data` as $state so the plain-JS smoke can
  // drive prop changes through <Render> (imperative mount props aren't reactive
  // on their own). `register` hands a `setData` mutator back to the harness.
  import { Render } from "../../../svelte/index.js";

  let { config, initialData, register } = $props();
  let data = $state(initialData);

  register({
    setData: (next) => {
      data = next;
    },
  });
</script>

<Render {config} {data} />
