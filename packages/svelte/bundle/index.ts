// Compiled layer for @puckeditor/svelte.
//
// All of core is compiled here from *source* against preact/compat (see
// tsup.config.ts) and bundled with the framework shim + the Svelte adapter into
// a single ESM artifact (one Preact instance). The Svelte source layer
// (../svelte/*.svelte) is the public component surface and stays external — the
// host app's vite-plugin-svelte compiles it.

// Base CSS: Inter webfont + core design tokens. Component/module CSS is pulled
// in transitively by the re-exported core graph below, so dist/index.css
// matches @puckeditor/core's.
import "../../core/bundle/index.css";

// Core's full surface: all types, framework-agnostic utilities (migrate,
// walkTree, resolveAllData, setDeep, transformProps, ...) and — for advanced
// interop — its Preact-compiled components (Svelte users use the Svelte
// components from the source layer instead).
export * from "../../core/bundle/core";

// Svelte public API.
export {
  transformConfig,
  transformFieldTypes,
  defineSvelteComponent,
  defineSvelteField,
} from "../src/transform-config";

// Cross-layer internals: consumed by the source layer (svelte/*.svelte), which
// can't reach into the shim directly. Exposed here because the single-entry
// bundle can't have a second JS entry without duplicating Preact.
export {
  createEditorHost,
  createRenderHost,
  mapDropZoneProps,
  DEFAULT_PUCK_CONTEXT,
  fieldLabelClasses,
  fieldLabelLockIconSvg,
} from "../src/shim";
export { registerBridge } from "../src/adapter";

export type {
  SvelteConfig,
  SvelteComponentConfig,
  SvelteRootConfig,
  SvelteComponent,
  SvelteField,
  SvelteFields,
  SvelteCustomField,
  TransformConfigOptions,
} from "../src/types";
