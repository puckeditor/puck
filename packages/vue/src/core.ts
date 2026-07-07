/**
 * Re-exports `@puckeditor/core` from SOURCE (not its published dist).
 *
 * The whole shim imports core through this module. Because it's a relative
 * import into core's source, esbuild compiles core here against preact/compat
 * (via the aliases in tsup.config.ts). NEVER import the `@puckeditor/core`
 * package name from shim runtime code — that would pull core's real-React
 * build, which is external to this bundle and would break.
 *
 * This intentionally imports `core` (no CSS side-effect); the top-level
 * `bundle/index.ts` is responsible for pulling core's CSS exactly once.
 */
export * from "../../core/bundle/core";
