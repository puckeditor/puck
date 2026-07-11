import { h, createPortal, Fragment, Suspense } from "./runtime";
import type { SlotMount } from "./registry";

/**
 * Render one Preact portal per registered outlet, piping each thunk's output
 * into the framework-owned DOM element. Shared by the component + field
 * bridges.
 *
 * Each thunk is called every render so the returned element keeps a stable
 * type (e.g. ContextSlotRender / DropZone), reconciling in place rather than
 * remounting.
 *
 * Content is wrapped in a `Suspense` boundary: portaled elements render
 * *outside* core's tree position, losing any boundary core would have
 * provided, and some core elements are lazy (e.g. richtext's
 * `RichTextRender`) — unguarded, their thrown promise would crash the bridge.
 */
export const renderOutletPortals = (
  mounts: SlotMount[],
  thunks: Record<string, ((dzProps: any) => any) | undefined>
) =>
  mounts.map((m) => {
    const thunk = thunks[m.thunkKey];
    const content = thunk && m.el ? thunk(m.dzProps) : null;
    return h(
      Fragment,
      { key: m.uid },
      content && m.el
        ? createPortal(
            h(Suspense as any, { fallback: null }, content),
            m.el
          )
        : null
    );
  });
