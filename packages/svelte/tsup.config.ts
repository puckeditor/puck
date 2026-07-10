import { createFrameworkBundleConfig } from "../tsup-config/framework-bundle";

// Compiled layer: compiled core + framework shim + Svelte adapter, Preact
// inlined exactly once. ESM-only (Svelte 5 is ESM). `svelte` and the raw
// `../svelte/*.svelte` source layer stay external — the host app's
// vite-plugin-svelte compiles the source layer against its single svelte
// runtime. See createFrameworkBundleConfig.
export default createFrameworkBundleConfig({
  framework: "svelte",
  format: ["esm"],
});
