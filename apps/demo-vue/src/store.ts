import { createPinia, defineStore } from "pinia";
import { ref } from "vue";

export const pinia = createPinia();

/**
 * A trivial Pinia store, read by CounterBadge inside the editor/preview via the
 * `app` prop's shared context — proving Pinia works across the Vue<->Puck bridge.
 */
export const useCounterStore = defineStore("counter", () => {
  const count = ref(3);
  const increment = () => {
    count.value += 1;
  };
  return { count, increment };
});
