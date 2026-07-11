import type { PuckContext as CorePuckContext } from "./core";

/**
 * The props Puck injects into every component `render` that are not user
 * field props. Runtime counterpart of core's `AsFieldProps` type
 * (`packages/core/types/Utils.tsx`) — keep in sync.
 */
export const RESERVED_RENDER_PROPS = ["children", "puck", "editMode"] as const;

/**
 * The per-component Puck context, mirroring core's `puck` render prop plus the
 * component's `id`. Each framework exposes this to bridged components its own
 * way (Vue: provide/inject; Svelte: setContext), and may append a
 * `renderDropZone` outlet.
 *
 * `isEditing`/`metadata` are typed via core's `PuckContext` so drift is a
 * compile error. `dragRef` is intentionally absent (the bridge attaches it to
 * the host element itself); `renderDropZone` is re-typed because the bridge
 * replaces core's render function with a framework outlet.
 */
export type PuckContext = Pick<CorePuckContext, "isEditing" | "metadata"> & {
  /** this component instance's Puck id. */
  id?: string;
  /** framework outlet for imperative DropZones (added by the adapter). */
  renderDropZone?: unknown;
  /**
   * The editor's `PuckApi` zustand store (`getState`/`subscribe`), added by the
   * bridge inside `<Puck>` (absent in `<Render>`). Powers the frameworks'
   * reactive editor-state accessors (Vue `usePuckApi`, Svelte `puckApi`).
   * Identity-stable across patches.
   */
  storeApi?: unknown;
};

/**
 * The fallback context for framework `usePuck`/`getPuck` accessors called
 * outside a bridged component.
 */
export const DEFAULT_PUCK_CONTEXT: PuckContext = {
  isEditing: false,
  metadata: {},
};

export type Split = {
  /** User field props (+ slot outlets, injected by the adapter) for the component. */
  props: Record<string, any>;
  /** Per-component context, exposed via the framework's context mechanism. */
  puck: PuckContext;
};

// Core's injected non-field props (children/puck/editMode), from core's
// runtime contract. The shim additionally moves `id` onto its puck context.
const RESERVED = new Set<string>([...RESERVED_RENDER_PROPS, "id"]);

/**
 * Split the props core passes to a component's `render` into:
 *  - `props` for the framework component (user field props; reserved injected
 *    props and slot props are excluded — slots are bridged via the outlet
 *    protocol, `children` via the children outlet);
 *  - a `puck` context object exposed via the framework's context mechanism.
 */
export const splitProps = (
  raw: Record<string, any>,
  slotPropNames: string[] = []
): Split => {
  const slots = new Set(slotPropNames);
  const props: Record<string, any> = {};

  for (const key in raw) {
    if (RESERVED.has(key)) continue;
    if (slots.has(key)) continue;
    props[key] = raw[key];
  }

  const rawPuck = raw.puck ?? {};
  const puck: PuckContext = {
    isEditing: !!rawPuck.isEditing,
    metadata: rawPuck.metadata ?? {},
    id: raw.id,
  };

  return { props, puck };
};
