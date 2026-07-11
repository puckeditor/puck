import { inject, shallowRef, onScopeDispose, type Ref } from "vue";
import type { PuckApi } from "../core";
import { PUCK_INJECTION_KEY } from "./use-puck";

type StoreApi = {
  getState: () => PuckApi;
  subscribe: (listener: (state: PuckApi) => void) => () => void;
};

/**
 * Reactively subscribe to the editor's `PuckApi` from within a bridged Vue
 * component or custom field — the Vue equivalent of React's selector-based
 * `usePuck`. Returns a shallow ref that updates whenever the selected value
 * changes (by identity):
 *
 * ```vue
 * <script setup>
 * import { usePuckApi } from "@puckeditor/vue";
 * const selectedItem = usePuckApi((api) => api.selectedItem);
 * const hasPast = usePuckApi((api) => api.history.hasPast);
 * </script>
 * ```
 *
 * Select the narrowest value you need — the ref updates (and re-renders
 * consumers) whenever the selected identity changes. Only available inside
 * `<Puck>` (there is no editor state in `<Render>`); for one-shot imperative
 * access, use the `getPuck` accessor from `@ready` instead.
 */
export function usePuckApi(): Readonly<Ref<PuckApi | undefined>>;
export function usePuckApi<T>(
  selector: (api: PuckApi) => T
): Readonly<Ref<T | undefined>>;
export function usePuckApi<T>(
  selector?: (api: PuckApi) => T
): Readonly<Ref<T | PuckApi | undefined>> {
  const ctx = inject(PUCK_INJECTION_KEY, null);
  const store = (ctx as any)?.storeApi as StoreApi | undefined;

  if (!store) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[@puckeditor/vue] usePuckApi() was called outside <Puck> (or outside " +
          "a bridged component); returning a ref that stays undefined."
      );
    }
    return shallowRef(undefined);
  }

  const select = selector ?? ((api: PuckApi) => api as unknown as T);
  const value = shallowRef<T | PuckApi | undefined>(select(store.getState()));

  const unsubscribe = store.subscribe((state) => {
    const next = select(state);
    if (next !== value.value) value.value = next;
  });

  onScopeDispose(unsubscribe);

  return value;
}
