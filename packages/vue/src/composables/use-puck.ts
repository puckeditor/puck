import { inject, toRefs, reactive, type Ref, type InjectionKey } from "vue";

/**
 * The per-component Puck context, made available to bridged Vue components via
 * provide/inject (so it never leaks onto the DOM as a fallthrough attribute).
 *
 * Mirrors core's `puck` render prop, plus the component's `id`:
 *  - `isEditing`   — true inside `<Puck>`, false inside `<Render>`
 *  - `metadata`    — merged Puck + component metadata
 *  - `id`          — this component instance's Puck id
 *  - `renderDropZone` — a Vue outlet component for imperative DropZones
 */
export type VuePuckContext = {
  isEditing: boolean;
  metadata: Record<string, any>;
  id?: string;
  renderDropZone?: unknown;
};

/** The reactive shape returned by `usePuck()` — a ref per context field. */
export type UsePuckReturn = {
  isEditing: Ref<boolean>;
  metadata: Ref<Record<string, any>>;
  id: Ref<string | undefined>;
  renderDropZone: Ref<unknown>;
};

export const PUCK_INJECTION_KEY: InjectionKey<VuePuckContext> =
  Symbol("puck-vue-context");

const defaultContext = (): VuePuckContext => ({
  isEditing: false,
  metadata: {},
});

/**
 * Access the current component's Puck context from within a bridged Vue
 * component. Returns reactive refs (Vue composable convention), so you can
 * destructure and keep reactivity:
 *
 * ```vue
 * <script setup>
 * import { usePuck } from "@puckeditor/vue";
 * const { isEditing, metadata } = usePuck();
 * </script>
 * <template>
 *   <span v-if="isEditing">Editing…</span>
 * </template>
 * ```
 *
 * To drive the editor imperatively, use the `getPuck` accessor exposed by
 * `<Puck>` (via a template ref or its `@ready` event) instead.
 */
export const usePuck = (): UsePuckReturn => {
  const ctx = inject(PUCK_INJECTION_KEY, null);
  return toRefs(ctx ?? reactive(defaultContext())) as UsePuckReturn;
};
