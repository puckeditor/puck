<script>
  // Class names are resolved in the compiled layer (where core's CSS module is
  // bundled and its hashes are known), so they line up with dist/index.css.
  import { fieldLabelClasses } from "../dist/index.js";

  /**
   * Svelte `FieldLabel` — markup/CSS parity with core's `FieldLabel`, for
   * building custom Svelte fields that look native. Snippets: `icon` (optional
   * label icon) and the default children (the field control).
   *
   * ```svelte
   * <FieldLabel label="Title"><input bind:value /></FieldLabel>
   * ```
   */
  let { label = "", el = "label", readOnly = false, icon, children } = $props();
</script>

<svelte:element this={el} class={fieldLabelClasses.root(readOnly)}>
  <div class={fieldLabelClasses.label}>
    {#if icon}<div class={fieldLabelClasses.labelIcon}>{@render icon()}</div>{/if}
    {label}
    {#if readOnly}
      <div class={fieldLabelClasses.disabledIcon} title="Read-only">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    {/if}
  </div>
  {@render children?.()}
</svelte:element>
