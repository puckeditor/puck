import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

// Loaded only when editing, so the editor stays out of your app's bundle
const Editor = lazy(() => import("./editor"));

/** The path being edited for URLs ending in /edit, e.g. /about/edit */
export const editorPath = (pathname: string) => {
  const segments = pathname.split("/");
  if (segments.at(-1) !== "edit") return null;
  return segments.slice(0, -1).join("/") || "/";
};

/** Renders the Puck editor at /edit URLs, and your app everywhere else */
export function PuckRoot({ children }: { children: ReactNode }) {
  const path = editorPath(window.location.pathname);
  if (path === null) return children;

  return (
    // Fill the window, whatever layout styles your app gives its root
    <div style={{ position: "fixed", inset: 0, textAlign: "initial" }}>
      <Suspense>
        <Editor path={path} />
      </Suspense>
    </div>
  );
}
