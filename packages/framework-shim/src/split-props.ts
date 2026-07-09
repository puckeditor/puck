/**
 * The per-component Puck context, mirroring core's `puck` render prop plus the
 * component's `id`. Each framework exposes this to bridged components its own
 * way (Vue: provide/inject; Svelte: setContext), and may append a
 * `renderDropZone` outlet.
 */
export type PuckContext = {
  /** true inside `<Puck>`, false inside `<Render>`. */
  isEditing: boolean;
  /** merged Puck + component metadata. */
  metadata: Record<string, any>;
  /** this component instance's Puck id. */
  id?: string;
  /** framework outlet for imperative DropZones (added by the adapter). */
  renderDropZone?: unknown;
};

export type Split = {
  /** User field props (+ slot outlets, injected by the adapter) for the component. */
  props: Record<string, any>;
  /** Per-component context, exposed via the framework's context mechanism. */
  puck: PuckContext;
};

/**
 * Split the props core passes to a component's `render` into:
 *  - `props` for the framework component (user field props; `editMode`/`puck`/
 *    `id`/`children` and slot props are excluded — slots are bridged via the
 *    outlet protocol);
 *  - a `puck` context object exposed via the framework's context mechanism.
 */
export const splitProps = (
  raw: Record<string, any>,
  slotPropNames: string[] = []
): Split => {
  const slots = new Set(slotPropNames);
  const props: Record<string, any> = {};

  for (const key in raw) {
    // `puck`/`id` → context; `editMode` deprecated; `children` is a Preact node
    // bridged via the children outlet; slot props via outlets.
    if (key === "puck" || key === "editMode" || key === "id") continue;
    if (key === "children") continue;
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
