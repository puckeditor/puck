export function resolvePuckPath(
  path = "",
  // `base` can be any valid origin, it is required for the URL constructor so
  // we can return a pathname - you can change this if you want, but it isn't
  // important
  base = "https://placeholder.com/"
) {
  const url = new URL(path, base);
  const segments = url.pathname.split("/");
  const isEditorRoute = segments.at(-1) === "edit";
  const pathname = isEditorRoute
    ? segments.slice(0, -1).join("/")
    : url.pathname;

  return {
    isEditorRoute,
    path: new URL(pathname, base).pathname,
  };
}
