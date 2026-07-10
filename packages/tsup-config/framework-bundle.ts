import { defineConfig, type Options } from "tsup";
import type { Plugin } from "esbuild";
import path from "path";
import { cssModulePlugin } from "./css-module-plugin";
import { createRuntimeCssPlugin } from "./runtime-css-plugin";

export type FrameworkBundleOptions = {
  /**
   * The bare framework package name kept EXTERNAL so the host app provides the
   * single framework runtime instance (e.g. `"vue"`, `"svelte"`). Everything
   * else — compiled core, the framework shim, all transitive React deps — is
   * bundled.
   */
  framework: string;
  /** Bundle entry. Defaults to `["bundle/index.ts"]`. */
  entry?: string[];
  /** Output formats. Defaults to `["cjs", "esm"]`. Svelte ships ESM-only. */
  format?: Options["format"];
  /**
   * Absolute path to the `@puckeditor/core` package root, used by the runtime
   * CSS plugin. Defaults to `../core` relative to the build cwd (the framework
   * package dir), which is correct for `packages/*`.
   */
  coreRoot?: string;
};

/**
 * Externalize `*.svelte` imports (the source layer). Svelte's compiler model
 * can't mint components at runtime, so the compiled layer keeps its imports of
 * the raw `.svelte` source layer external; the host app's vite-plugin-svelte
 * compiles them (sharing the host's single `svelte/internal` runtime). No-op
 * for frameworks with no `.svelte` imports (e.g. Vue).
 */
const externalizeSvelteFilesPlugin: Plugin = {
  name: "externalize-svelte-files",
  setup(build) {
    build.onResolve({ filter: /\.svelte$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

/**
 * Shared tsup config for a framework package (`@puckeditor/vue`,
 * `@puckeditor/svelte`, …).
 *
 * ONE JS entry. With Preact fully bundled, multiple JS entries would each get
 * their own Preact copy (esbuild code-splitting is ESM-only), producing broken
 * hooks across copies. Everything — compiled core + the framework shim + the
 * adapter — ships in a single bundle, guaranteeing exactly one Preact instance.
 *
 * `dist/no-external.css` is derived from `dist/index.css` in a post-build step
 * (see `make-no-external-css.mjs`) rather than a second JS entry, so the
 * single-Preact-instance invariant is preserved.
 */
export const createFrameworkBundleConfig = (options: FrameworkBundleOptions) => {
  // NOTE: tsup bundles this factory together with the importing
  // `tsup.config.ts`, so `import.meta.dirname` here resolves to the CONSUMING
  // framework package dir (e.g. packages/vue), not packages/tsup-config. All
  // framework packages are siblings under `packages/`, so `../tsup-config` and
  // `../core` are correct from any of them.
  const {
    framework,
    entry = ["bundle/index.ts"],
    format = ["cjs", "esm"],
    coreRoot = path.resolve(import.meta.dirname, "../core"),
  } = options;

  return defineConfig({
    entry,
    dts: true,
    format,
    // Resolve browser builds/conditions (like core does), so deps such as
    // @tiptap/html use the global DOM instead of pulling happy-dom + Node
    // built-ins into a browser bundle.
    platform: "browser",
    inject: [path.resolve(import.meta.dirname, "../tsup-config/react-import.js")],
    // Bundle EVERYTHING (including preact and all of core's transitive React
    // deps); only the framework runtime stays external so the host app provides
    // the single instance.
    noExternal: [new RegExp(`^(?!${framework}$|${framework}\\/)`)],
    external: [new RegExp(`^${framework}(\\/|$)`)],
    esbuildOptions(esbuildOpts) {
      // esbuild applies `alias` before `external` and rewrites imports inside
      // bundled node_modules — so transitive react consumers
      // (use-sync-external-store, react-remove-scroll, Radix internals,
      // @tiptap/react, @tanstack/react-virtual, zustand) all sweep onto
      // preact/compat.
      esbuildOpts.alias = {
        "react/jsx-runtime": "preact/jsx-runtime",
        "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
        "react-dom/client": "preact/compat/client",
        "react-dom": "preact/compat",
        react: "preact/compat",
      };
    },
    esbuildPlugins: [
      externalizeSvelteFilesPlugin,
      cssModulePlugin,
      createRuntimeCssPlugin(coreRoot),
    ],
  });
};
