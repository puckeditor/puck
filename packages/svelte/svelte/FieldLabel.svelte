<script>
  // Class names + lock icon come from core (via the compiled layer, where
  // core's CSS module is bundled and its hashes are known), so they line up
  // with dist/index.css and never drift from core's FieldLabel.
  import { fieldLabelClasses, fieldLabelLockIconSvg } from "../dist/index.js";

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
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static SVG constant from core -->
        {@html fieldLabelLockIconSvg}
      </div>
    {/if}
  </div>
  {@render children?.()}
</svelte:element>
