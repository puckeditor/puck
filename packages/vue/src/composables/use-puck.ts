import { inject, reactive, type InjectionKey } from "vue";
import { DEFAULT_PUCK_CONTEXT } from "../shim";

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

export const PUCK_INJECTION_KEY: InjectionKey<VuePuckContext> =
  Symbol("puck-vue-context");

/**
 * Access the current component's Puck context from within a bridged Vue
 * component. Returns the reactive context object itself, so property reads are
 * reactive both in templates and via `toRefs` destructuring:
 *
 * ```vue
 * <script setup>
 * import { usePuck } from "@puckeditor/vue";
 * const puck = usePuck();                       // puck.isEditing in template
 * const { isEditing } = toRefs(usePuck());      // or destructure with toRefs
 * </script>
 * <template>
 *   <span v-if="puck.isEditing">Editing…</span>
 * </template>
 * ```
 *
 * To drive the editor imperatively, use the `getPuck` accessor exposed by
 * `<Puck>` (via its `@ready` event) instead.
 */
export const usePuck = (): VuePuckContext => {
  const ctx = inject(PUCK_INJECTION_KEY, null);

  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[@puckeditor/vue] usePuck() was called outside a component rendered " +
          "by Puck; returning a default context (isEditing: false)."
      );
    }
    return reactive({ ...DEFAULT_PUCK_CONTEXT }) as VuePuckContext;
  }

  return ctx;
};
