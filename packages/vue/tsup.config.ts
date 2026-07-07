import { defineConfig } from "tsup";
import path from "path";
import { cssModulePlugin } from "../tsup-config/css-module-plugin";
import { createRuntimeCssPlugin } from "../tsup-config/runtime-css-plugin";

const coreRoot = path.resolve(import.meta.dirname, "../core");

export default defineConfig({
  // ONE JS entry. With Preact fully bundled, multiple JS entries would each
  // get their own Preact copy (esbuild code-splitting is ESM-only), producing
  // broken hooks across copies. Everything — compiled core + Vue shim — ships
  // in a single bundle, guaranteeing exactly one Preact instance.
  //
  // `dist/no-external.css` is derived from `dist/index.css` in a post-build
  // step (see scripts/make-no-external-css.mjs) rather than a second JS entry,
  // so the single-Preact-instance invariant is preserved.
  entry: ["bundle/index.ts"],
  dts: true,
  format: ["cjs", "esm"],
  // Resolve browser builds/conditions (like core does), so deps such as
  // @tiptap/html use the global DOM instead of pulling happy-dom + Node
  // built-ins into a browser bundle.
  platform: "browser",
  inject: ["../tsup-config/react-import.js"],
  // Bundle EVERYTHING (including preact and all of core's transitive React
  // deps); only `vue` stays external so the host app provides the single Vue
  // runtime instance.
  noExternal: [/^(?!vue$|vue\/)/],
  external: [/^vue(\/|$)/],
  esbuildOptions(options) {
    // esbuild applies `alias` before `external` and rewrites imports inside
    // bundled node_modules — so transitive react consumers (use-sync-external-store,
    // react-remove-scroll, Radix internals, @tiptap/react, @tanstack/react-virtual,
    // zustand) all sweep onto preact/compat.
    options.alias = {
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
      "react-dom/client": "preact/compat/client",
      "react-dom": "preact/compat",
      react: "preact/compat",
    };
  },
  esbuildPlugins: [cssModulePlugin, createRuntimeCssPlugin(coreRoot)],
});
