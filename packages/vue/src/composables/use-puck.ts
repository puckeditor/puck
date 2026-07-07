import { inject, type InjectionKey } from "vue";

/**
 * The per-component Puck context, made available to bridged Vue components via
 * provide/inject (so it never leaks onto the DOM as a fallthrough attribute).
 *
 * Mirrors core's `puck` render prop, plus the component's `id`:
 *  - `isEditing`   — true inside `<Puck>`, false inside `<Render>`
 *  - `metadata`    — merged Puck + component metadata
 *  - `id`          — this component instance's Puck id
 *  - `renderDropZone` — a Vue outlet component for imperative DropZones (Step 5)
 */
export type VuePuckContext = {
  isEditing: boolean;
  metadata: Record<string, any>;
  id?: string;
  renderDropZone?: unknown;
};

export const PUCK_INJECTION_KEY: InjectionKey<VuePuckContext> =
  Symbol("puck-vue-context");

const DEFAULT_CONTEXT: VuePuckContext = {
  isEditing: false,
  metadata: {},
};

/**
 * Access the current component's Puck context from within a bridged Vue
 * component. Returns a reactive object (safe to destructure in template via
 * `toRefs` if you need reactivity on individual fields).
 *
 * Note: this is the Vue package's `usePuck` — it returns the per-component
 * context. To drive the editor imperatively, use the `getPuck` accessor from
 * `<Puck>`'s `@ready` event instead.
 */
export const usePuck = (): VuePuckContext =>
  inject(PUCK_INJECTION_KEY, DEFAULT_CONTEXT);
