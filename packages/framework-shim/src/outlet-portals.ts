import { h, createPortal, Fragment } from "./runtime";
import type { SlotMount } from "./registry";

/**
 * Render one Preact portal per registered outlet, piping each thunk's output
 * into the framework-owned DOM element. Shared by the component + field
 * bridges.
 *
 * Each thunk is called every render so the returned element keeps a stable
 * type (e.g. ContextSlotRender / DropZone), reconciling in place rather than
 * remounting.
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
      content && m.el ? createPortal(content, m.el) : null
    );
  });
