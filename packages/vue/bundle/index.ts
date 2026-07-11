// Single JS entry for @puckeditor/vue.
//
// All of core is compiled here from *source* against preact/compat (see
// tsup.config.ts). The Vue shim (../src) is layered on top and its `Puck` /
// `Render` intentionally shadow core's React ones via explicit named re-exports
// (explicit exports win over `export *`).

// Base CSS: Inter webfont + core design tokens. Component/module CSS is pulled
// in transitively by the re-exported core graph below, so dist/index.css
// matches @puckeditor/core's.
import "../../core/bundle/index.css";

// Core's full surface: all types, framework-agnostic utilities (migrate,
// walkTree, resolveAllData, setDeep, transformProps, ...) and — for advanced
// interop — its Preact-compiled components. Vue users primarily use the Vue
// exports below; the rest is core's shared, framework-agnostic API.
export * from "../../core/bundle/core";

// Vue shim public API. `Puck`, `Render`, `FieldLabel` and `usePuck` shadow
// core's React ones (which are unusable from Vue anyway).
export {
  Puck,
  Render,
  FieldLabel,
  transformConfig,
  transformFieldTypes,
  defineVueComponent,
  defineVueField,
  usePuck,
  usePuckApi,
} from "../src";
export type {
  VueConfig,
  VueComponentConfig,
  VueRootConfig,
  VueComponent,
  VueSlot,
  VueField,
  VueFields,
  VueCustomField,
  TransformConfigOptions,
  VuePuckContext,
} from "../src";
