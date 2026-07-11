<script>
  // Test harness component: owns `metadata` as $state so the plain-JS smoke
  // can drive metadata changes through <Puck> and assert the puck-context
  // patch propagates to getPuck() consumers.
  import { Puck } from "../../../svelte/index.js";

  let { config, data, register } = $props();
  let metadata = $state({ tag: "one" });

  register({
    setMetadata: (next) => {
      metadata = next;
    },
  });
</script>

<Puck {config} {data} {metadata} iframe={{ enabled: false }} />
