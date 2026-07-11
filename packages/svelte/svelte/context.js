import { getContext } from "svelte";
import { mapDropZoneProps, DEFAULT_PUCK_CONTEXT } from "../dist/index.js";

/**
 * Svelte context keys shared between `Bridge.svelte` and the components/outlets
 * it hosts. Plain module-level symbols (stable across the source-layer bundle).
 */
export const PUCK_CONTEXT = Symbol("puck:context");
export const OUTLET_CONTEXT = Symbol("puck:outlet");

/**
 * Read the current component's Puck context from within a bridged Svelte
 * component: a reactive `$state` object `{ isEditing, metadata, id }` (Svelte 5
 * unwraps state on access, so `getPuck().isEditing` stays reactive).
 *
 * ```svelte
 * <script>
 *   import { getPuck } from "@puckeditor/svelte";
 *   const puck = getPuck();
 * </script>
 * {#if puck.isEditing}<span>Editing…</span>{/if}
 * ```
 *
 * To drive the editor imperatively, use the `getPuck` accessor from `<Puck>`'s
 * `onready` callback instead.
 */
export function getPuck() {
  return getContext(PUCK_CONTEXT) ?? DEFAULT_PUCK_CONTEXT;
}

export { mapDropZoneProps };
