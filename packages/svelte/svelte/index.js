// Public entry for @puckeditor/svelte, resolved via the "svelte" export
// condition so vite-plugin-svelte compiles the raw components in the host app.
//
// Components come from this source layer; the framework-agnostic API
// (transformConfig, defineSvelte*, and all of core's utilities) is re-exported
// from the compiled layer. Explicit component exports shadow core's React
// `Puck`/`Render`/`FieldLabel` that arrive via the `export *` below.

// Register Bridge.svelte with the compiled layer (side effect — see
// `sideEffects` in package.json). The compiled layer can't import `.svelte`
// itself: its graph must stay evaluatable in plain node for server-side use
// of the framework-agnostic utilities.
import Bridge from "./Bridge.svelte";
import { registerBridge } from "../dist/index.js";
registerBridge(Bridge);

export { default as Puck } from "./Puck.svelte";
export { default as Render } from "./Render.svelte";
export { default as PuckSlot } from "./PuckSlot.svelte";
export { default as PuckText } from "./PuckText.svelte";
export { default as PuckDropZone } from "./PuckDropZone.svelte";
export { default as PuckChildren } from "./PuckChildren.svelte";
export { default as FieldLabel } from "./FieldLabel.svelte";
export { getPuck } from "./context.js";
export { puckApi } from "./puck-api.svelte.js";

export * from "../dist/index.js";
