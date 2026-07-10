/**
 * Re-exports `@puckeditor/core` from SOURCE (not its published dist), compiled
 * here against preact/compat via the framework bundle aliases. NEVER import the
 * `@puckeditor/core` package name from runtime code — that would pull core's
 * real-React build, which is external to this bundle and would break.
 */
export * from "../../core/bundle/core";
