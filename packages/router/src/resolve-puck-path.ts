export type ResolvedPuckPath = {
  /** True when the incoming path used the `/edit` suffix convention. */
  isEditorRoute: boolean;
  /** Normalised, decoded pathname with any `/edit` suffix removed. */
  path: string;
};

// `base` can be any valid origin. It is required for the URL constructor so we
// can return a pathname; it never appears in the result.
const DEFAULT_BASE = "https://placeholder.puckeditor.com/";

/**
 * Turns whatever a framework hands us into a canonical page path.
 *
 * Accepts a string (React Router splat, a raw pathname) or the string array
 * Next.js produces for a catch-all segment.
 *
 * Routing through `URL` rather than joining segments means `..` is resolved
 * away, so a request for `/a/../../b` cannot address a store key outside the
 * page namespace.
 */
export function resolvePuckPath(
  path: string | string[] = "",
  base = DEFAULT_BASE
): ResolvedPuckPath {
  const joined = Array.isArray(path) ? path.join("/") : path;
  const url = new URL(joined, base);
  const segments = url.pathname.split("/");
  const isEditorRoute = segments[segments.length - 1] === "edit";
  const pathname = isEditorRoute
    ? segments.slice(0, -1).join("/")
    : url.pathname;

  return {
    isEditorRoute,
    path: normalize(new URL(pathname, base).pathname),
  };
}

/**
 * Strips trailing slashes and percent-decoding so that `/pricing`, `/pricing/`
 * and `/pricing/edit` all agree on one store key.
 */
function normalize(pathname: string): string {
  const trimmed =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const result = trimmed === "" ? "/" : trimmed;

  try {
    return decodeURIComponent(result);
  } catch {
    // Malformed escape sequence — keep the raw pathname rather than throwing on
    // what is, ultimately, just a request for a page that won't exist.
    return result;
  }
}
