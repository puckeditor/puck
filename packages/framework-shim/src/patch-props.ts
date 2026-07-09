/**
 * Reconcile a live reactive object toward `next`: update changed keys and
 * delete removed ones. The framework's reactivity (Vue `shallowReactive`,
 * Svelte `$state`, …) propagates the mutations so a mounted component patches
 * instead of remounting.
 */
export const patchProps = (
  reactive: Record<string, any>,
  next: Record<string, any>
) => {
  for (const key in next) {
    if (reactive[key] !== next[key]) {
      reactive[key] = next[key];
    }
  }
  for (const key in reactive) {
    if (!(key in next)) {
      delete reactive[key];
    }
  }
};
