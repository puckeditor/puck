import { getContext } from "svelte";
import { PUCK_CONTEXT } from "./context.js";

/**
 * Reactively subscribe to the editor's `PuckApi` from within a bridged Svelte
 * component or custom field — the Svelte equivalent of React's selector-based
 * `usePuck`. Returns `{ current }`, updated whenever the selected value
 * changes (by identity). Call during component init.
 *
 * ```svelte
 * <script>
 *   import { puckApi } from "@puckeditor/svelte";
 *   const selected = puckApi((api) => api.selectedItem);
 *   const hasPast = puckApi((api) => api.history.hasPast);
 * </script>
 * {#if hasPast.current}<button onclick={undo}>Undo</button>{/if}
 * ```
 *
 * Select the narrowest value you need — consumers re-render whenever the
 * selected identity changes. Only available inside `<Puck>` (there is no
 * editor state in `<Render>`); for one-shot imperative access, use the
 * `getPuck` accessor from `<Puck>`'s `onready` callback instead.
 */
export function puckApi(selector = (api) => api) {
  const ctx = getContext(PUCK_CONTEXT);
  const store = ctx?.storeApi;

  if (!store) {
    if (typeof console !== "undefined") {
      console.warn(
        "[@puckeditor/svelte] puckApi() was called outside <Puck> (or outside " +
          "a bridged component); `current` will stay undefined."
      );
    }
    return {
      get current() {
        return undefined;
      },
    };
  }

  let current = $state.raw(selector(store.getState()));

  // subscribe returns its unsubscriber, which becomes the effect cleanup.
  $effect(() =>
    store.subscribe((state) => {
      const next = selector(state);
      if (next !== current) current = next;
    })
  );

  return {
    get current() {
      return current;
    },
  };
}
