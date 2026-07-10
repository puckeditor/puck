import { getContext } from "svelte";

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
  return getContext(PUCK_CONTEXT) ?? { isEditing: false, metadata: {} };
}

/**
 * Map an outlet's props to core `DropZoneProps`: Svelte's `class` → React's
 * `className`; everything else (allow, disallow, zone, minEmptyHeight,
 * collisionAxis, style, …) passes through.
 */
export function mapDropZoneProps(props) {
  const { class: className, ...rest } = props;
  const dzProps = { ...rest };
  if (className != null) dzProps.className = className;
  return dzProps;
}
