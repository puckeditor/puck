/**
 * Re-exports `@puckeditor/core` from SOURCE (not its published dist).
 *
 * The whole shim imports core through this module. Because it's a relative
 * import into core's source, esbuild compiles core here against preact/compat
 * (via the aliases in the framework bundle config). NEVER import the
 * `@puckeditor/core` package name from shim runtime code — that would pull
 * core's real-React build, which is external to the framework bundle and would
 * break.
 *
 * This intentionally imports `core` (no CSS side-effect); each framework
 * package's `bundle/index.ts` is responsible for pulling core's CSS exactly
 * once.
 *
 * The relative depth (`../../core/bundle/core`) assumes this file lives at
 * `packages/framework-shim/src/core.ts`, a sibling of `packages/core`. esbuild
 * resolves symlinks to real paths, so this stays correct even when the shim is
 * imported by package name from another workspace package.
 */
export * from "../../core/bundle/core";
