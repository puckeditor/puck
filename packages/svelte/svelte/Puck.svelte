<script>
  import { onMount, onDestroy, untrack } from "svelte";
  import {
    createEditorHost,
    transformConfig,
    transformFieldTypes,
  } from "../dist/index.js";

  /**
   * Svelte `<Puck>` — the full Puck editor, driven by a Svelte config.
   *
   * A thin shell over the shared `createEditorHost`: it renders one host `<div>`,
   * translates Svelte props/callbacks into host calls, and lets the shared host
   * own the Preact render into that div. `data` is initial-only (matches React
   * `<Puck>`); a `config` identity change is a documented full remount.
   */
  let {
    config,
    data,
    ui,
    permissions,
    viewports,
    iframe,
    initialHistory,
    metadata,
    headerTitle,
    headerPath,
    height,
    overrides,
    plugins,
    fieldTypes,
    context = null,
    onchange,
    onpublish,
    onaction,
    onready,
  } = $props();

  let hostEl;
  let mounted = false;
  // Baseline for detecting `config` identity changes; the $effect below reads
  // the live prop, so capturing the initial value here is intentional.
  // svelte-ignore state_referenced_locally
  let lastConfig = config;

  const host = createEditorHost({
    transformConfig: (cfg) => transformConfig(cfg, { context }),
    transformFieldTypes: (ft) => transformFieldTypes(ft, { context }),
  });

  const collect = () => ({
    config,
    data,
    ui,
    permissions,
    viewports,
    iframe,
    initialHistory,
    metadata,
    headerTitle,
    headerPath,
    height,
    overrides,
    plugins,
    fieldTypes,
    onChange: onchange,
    onPublish: onpublish,
    onAction: onaction,
    onReady: onready,
  });

  onMount(() => {
    host.mount(hostEl, collect());
    mounted = true;
  });

  // Passthrough props: reconcile in place (editor state survives). `data` is
  // initial-only and `config` identity is handled separately, so collect() is
  // untracked to avoid re-firing on those.
  $effect(() => {
    ui;
    permissions;
    viewports;
    iframe;
    metadata;
    headerTitle;
    headerPath;
    height;
    plugins;
    overrides;
    fieldTypes;
    if (mounted) untrack(() => host.update(collect()));
  });

  // config identity change ⇒ documented full remount.
  $effect(() => {
    config;
    if (mounted && config !== lastConfig) {
      lastConfig = config;
      untrack(() => host.updateConfig(collect()));
    }
  });

  onDestroy(() => host.unmount());
</script>

<div bind:this={hostEl}></div>
