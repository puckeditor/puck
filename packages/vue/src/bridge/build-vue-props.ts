import type { VuePuckContext } from "../composables/use-puck";

export type SplitVueProps = {
  /** User field props (+ slot outlets, added in Step 5) passed as reactive props. */
  props: Record<string, any>;
  /** Per-component context, provided via inject (never a DOM fallthrough attr). */
  puck: VuePuckContext;
};

/**
 * Split the props core passes to a component's `render` into:
 *  - reactive `props` for the Vue component (user field props; slot props are
 *    handled by the outlet protocol in Step 5, and `editMode`/`puck`/`id` are
 *    excluded);
 *  - a `puck` context object provided via inject.
 */
export const buildVueProps = (
  raw: Record<string, any>,
  slotPropNames: string[] = []
): SplitVueProps => {
  const slots = new Set(slotPropNames);
  const props: Record<string, any> = {};

  for (const key in raw) {
    // `puck`/`id` → injected context; `editMode` deprecated; `children` is a
    // Preact node bridged via the children outlet; slot props via outlets.
    if (key === "puck" || key === "editMode" || key === "id") continue;
    if (key === "children") continue;
    if (slots.has(key)) continue;
    props[key] = raw[key];
  }

  const rawPuck = raw.puck ?? {};
  const puck: VuePuckContext = {
    isEditing: !!rawPuck.isEditing,
    metadata: rawPuck.metadata ?? {},
    id: raw.id,
  };

  return { props, puck };
};
