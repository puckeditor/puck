/**
 * Framework-agnostic core for @puckeditor/router.
 *
 * Nothing in this entry imports a framework or touches the filesystem, so it is
 * safe from a server component, an edge runtime or a plain Node script. The
 * Next.js glue lives in `@puckeditor/router/next`.
 */
export { definePage } from "./src/define-page";
export {
  emptyPageData,
  indexPages,
  listPagePaths,
  resolvePage,
} from "./src/resolve-page";
export { resolvePuckPath } from "./src/resolve-puck-path";
export { sourceHash, stableStringify } from "./src/source-hash";

export type { ResolvePageOptions } from "./src/resolve-page";
export type { ResolvedPuckPath } from "./src/resolve-puck-path";
export type {
  PageMap,
  PageMode,
  PageOrigin,
  PageSource,
  PageStore,
  Pages,
  ResolvedPage,
  StoredPage,
} from "./src/types";
