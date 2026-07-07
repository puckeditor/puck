/**
 * Reconcile a live `shallowReactive` object toward `next`: update changed keys
 * and delete removed ones. Vue reactivity propagates the changes so a mounted
 * component patches instead of remounting.
 */
export const patchReactiveProps = (
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
