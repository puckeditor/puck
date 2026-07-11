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
   * `<Puck>`); a `config` identity change is a documented full remount;
   * `context` is read once at setup.
   */
  let {
    config,
    data,
    ui,
    permissions,
    viewports,
    iframe,
    dnd,
    initialHistory,
    metadata,
    headerTitle,
    headerPath,
    height,
    overrides,
    plugins,
    fieldTransforms,
    fieldTypes,
    context = null,
    onchange,
    onpublish,
    onaction,
    onready,
    _experimentalFullScreenCanvas,
    _experimentalVirtualization,
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

  // Stable wrappers reading the live prop bindings at call time, so a swapped
  // callback prop (e.g. a new `onchange`) is picked up without any host
  // update — the host holds these identities forever.
  const callbacks = {
    onChange: (d) => onchange?.(d),
    onPublish: (d) => onpublish?.(d),
    onAction: (a, s, p) => onaction?.(a, s, p),
    onReady: (g) => onready?.(g),
  };

  const collect = () => ({
    config,
    data,
    ui,
    permissions,
    viewports,
    iframe,
    dnd,
    initialHistory,
    metadata,
    headerTitle,
    headerPath,
    height,
    overrides,
    plugins,
    fieldTransforms,
    fieldTypes,
    _experimentalFullScreenCanvas,
    _experimentalVirtualization,
    ...callbacks,
  });

  onMount(() => {
    host.mount(hostEl, collect());
    mounted = true;
  });

  // Passthrough props: reconcile in place (editor state survives). `data`/`ui`
  // are initial-only and `config` identity is handled separately, so collect()
  // is untracked to avoid re-firing on those.
  $effect(() => {
    permissions;
    viewports;
    iframe;
    dnd;
    metadata;
    headerTitle;
    headerPath;
    height;
    plugins;
    overrides;
    fieldTransforms;
    fieldTypes;
    _experimentalFullScreenCanvas;
    _experimentalVirtualization;
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
