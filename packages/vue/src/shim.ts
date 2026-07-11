/**
 * Re-exports the private framework shim from SOURCE (same pattern as
 * `./core.ts`). Import the shim through this module — never by its package
 * name: the shim is never published, so a package-name import would leave a
 * dangling reference in the emitted `dist/index.d.ts` (tsup's dts bundler
 * keeps package-name imports external), breaking consumers' types.
 */
export * from "../../framework-shim/src";
