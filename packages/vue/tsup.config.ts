import { createFrameworkBundleConfig } from "../tsup-config/framework-bundle";

// Single-JS-entry bundle: compiled core + framework shim + Vue adapter, with
// Preact inlined exactly once. Only `vue` stays external so the host app
// provides the single Vue runtime instance. See createFrameworkBundleConfig.
export default createFrameworkBundleConfig({ framework: "vue" });
