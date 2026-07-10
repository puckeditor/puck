// A trivial runes store, read by CounterBadge inside the editor/preview via the
// `context` prop's threaded Map — proving app-level Svelte context works across
// the Svelte<->Puck bridge (the analogue of demo-vue's Pinia + `app` prop).
export const COUNTER_KEY = Symbol("counter");

function createCounterStore() {
  let count = $state(3);
  return {
    get count() {
      return count;
    },
    increment() {
      count += 1;
    },
  };
}

export const counterStore = createCounterStore();
