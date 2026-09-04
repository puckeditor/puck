import type { Data } from "@puckeditor/core";

import { resolvePuckPath } from "./resolve-puck-path";
import type {
  PageMap,
  PageMode,
  PageSource,
  PageStore,
  Pages,
  ResolvedPage,
} from "./types";

/** Data for a page that doesn't exist yet. Fresh object per call. */
export const emptyPageData = (): Data => ({
  content: [],
  root: { props: { title: "" } },
});

const indexCache = new WeakMap<object, PageMap<any>>();

/**
 * Indexes pages by canonical path.
 *
 * Accepts the barrel array a user exports or a pre-built record; both are
 * re-keyed through `resolvePuckPath` so a page authored as `pricing/` is found
 * by a request for `/pricing` either way.
 *
 * Memoised on the input's identity, so the common case — one module-level
 * `puck.pages.ts` export — indexes once per process, not once per request.
 */
export function indexPages<UserData extends Data = Data>(
  pages?: Pages<UserData>
): PageMap<UserData> {
  if (!pages) return {};

  const cached = indexCache.get(pages);
  if (cached) return cached;

  const entries: PageSource<UserData>[] = Array.isArray(pages)
    ? pages
    : Object.keys(pages).map((key) => ({ ...pages[key], path: key }));

  const map: PageMap<UserData> = {};

  for (const page of entries) {
    const { path } = resolvePuckPath(page.path);

    if (map[path]) {
      throw new Error(
        `[@puckeditor/router] Duplicate page path "${path}" — two pages resolve to the same route.`
      );
    }

    // Keep the original object when the path already agrees — spreading would
    // read `sourceHash`, forcing the lazy hash that `definePage` sets up.
    map[path] = page.path === path ? page : { ...page, path };
  }

  indexCache.set(pages, map);

  return map;
}

export type ResolvePageOptions<UserData extends Data = Data> = {
  /** The request path. A string, or the segment array Next.js provides. */
  pathname: string | string[];
  pages?: Pages<UserData>;
  store?: PageStore<UserData>;
  /**
   * Forces the mode instead of inferring it from an `/edit` suffix.
   *
   * Required for Next.js, where the proxy rewrites `/pricing/edit` to
   * `/puck/pricing` — the suffix is gone by the time the editor route runs, so
   * inference would report `render` and 404 instead of opening a new page.
   */
  mode?: PageMode;
};

/**
 * Resolves a request path to page data.
 *
 * Order is: user page in the store → code-defined page → nothing. Returns
 * `null` when there is no page and we're not in the editor; the caller decides
 * how to 404.
 */
export async function resolvePage<UserData extends Data = Data>({
  pathname,
  pages,
  store,
  mode: modeOverride,
}: ResolvePageOptions<UserData>): Promise<ResolvedPage<UserData> | null> {
  const { isEditorRoute, path } = resolvePuckPath(pathname);
  const mode: PageMode = modeOverride ?? (isEditorRoute ? "edit" : "render");

  const code: PageSource<UserData> | undefined = indexPages(pages)[path];
  const stored = store ? await store.get(path) : null;

  if (stored) {
    return {
      path,
      mode,
      data: stored.data,
      origin: "store",
      // Drift means "the code page moved on since we forked from it", so it
      // needs a fork to compare against. A stored page with no `forkedFromHash`
      // was authored in the editor — including every row written before this
      // package existed — and reporting drift for those would light the banner
      // on every page the first time an app adopts the router.
      drift:
        !!code &&
        stored.forkedFromHash !== undefined &&
        stored.forkedFromHash !== code.sourceHash,
    };
  }

  if (code) {
    return { path, mode, data: code.data, origin: "code", drift: false };
  }

  if (mode === "edit") {
    return {
      path,
      mode,
      data: emptyPageData() as UserData,
      origin: "new",
      drift: false,
    };
  }

  return null;
}

/**
 * Every path the app can serve — code pages unioned with everything in the
 * store. This is what `generateStaticParams` needs to prerender.
 */
export async function listPagePaths<UserData extends Data = Data>({
  pages,
  store,
}: {
  pages?: Pages<UserData>;
  store?: PageStore<UserData>;
}): Promise<string[]> {
  const paths = Object.keys(indexPages(pages));

  if (store) {
    for (const path of await store.list()) {
      paths.push(resolvePuckPath(path).path);
    }
  }

  return Array.from(new Set(paths)).sort();
}
