import { AppStore } from "../../store";
import { PuckNodeData, PuckZoneData } from "../../types/Internal";

/**
 * Cache for memoized zone selectors.
 * This prevents creating new selector functions on every call.
 */
const zoneContentSelectorCache = new Map<
  string,
  (state: AppStore) => string[] | undefined
>();

const nodeSelectorCache = new Map<
  string,
  (state: AppStore) => PuckNodeData | undefined
>();

/**
 * Get a memoized selector for zone content IDs.
 * Returns stable references when the underlying data hasn't changed.
 *
 * @param zoneCompound - The zone identifier (e.g., "root:default-zone" or "componentId:slotName")
 * @returns A selector function that extracts contentIds for the zone
 */
export function getZoneContentSelector(
  zoneCompound: string
): (state: AppStore) => string[] | undefined {
  let selector = zoneContentSelectorCache.get(zoneCompound);

  if (!selector) {
    selector = (state: AppStore) =>
      state.state.indexes.zones[zoneCompound]?.contentIds;
    zoneContentSelectorCache.set(zoneCompound, selector);
  }

  return selector;
}

/**
 * Get a memoized selector for zone data.
 *
 * @param zoneCompound - The zone identifier
 * @returns A selector function that extracts zone data
 */
export function getZoneDataSelector(
  zoneCompound: string
): (state: AppStore) => PuckZoneData | undefined {
  return (state: AppStore) => state.state.indexes.zones[zoneCompound];
}

/**
 * Get a memoized selector for node data.
 * Returns stable references when the underlying data hasn't changed.
 *
 * @param nodeId - The component ID
 * @returns A selector function that extracts node data
 */
export function getNodeSelector(
  nodeId: string
): (state: AppStore) => PuckNodeData | undefined {
  let selector = nodeSelectorCache.get(nodeId);

  if (!selector) {
    selector = (state: AppStore) => state.state.indexes.nodes[nodeId];
    nodeSelectorCache.set(nodeId, selector);
  }

  return selector;
}

/**
 * Get a memoized selector for node props.
 *
 * @param nodeId - The component ID
 * @returns A selector function that extracts flattened props
 */
export function getNodePropsSelector(
  nodeId: string
): (state: AppStore) => Record<string, unknown> | undefined {
  return (state: AppStore) =>
    state.state.indexes.nodes[nodeId]?.flatData.props;
}

/**
 * Get a selector for checking if a component is selected.
 *
 * @param componentId - The component ID
 * @returns A selector function that returns true if selected
 */
export function getIsSelectedSelector(
  componentId: string
): (state: AppStore) => boolean {
  return (state: AppStore) =>
    state.selectedItem?.props.id === componentId || false;
}

/**
 * Get a selector for checking if a component is loading.
 *
 * @param componentId - The component ID
 * @returns A selector function that returns true if loading
 */
export function getIsLoadingSelector(
  componentId: string
): (state: AppStore) => boolean {
  return (state: AppStore) =>
    state.componentState[componentId]?.loadingCount > 0;
}

/**
 * Clear all selector caches.
 * Useful when resetting the editor state.
 */
export function clearSelectorCaches(): void {
  zoneContentSelectorCache.clear();
  nodeSelectorCache.clear();
}

/**
 * Batch selector for multiple zone content IDs.
 * More efficient than calling getZoneContentSelector multiple times.
 *
 * @param zoneCompounds - Array of zone identifiers
 * @returns A selector that returns a map of zone compound to content IDs
 */
export function getBatchZoneContentSelector(
  zoneCompounds: string[]
): (state: AppStore) => Map<string, string[] | undefined> {
  return (state: AppStore) => {
    const result = new Map<string, string[] | undefined>();
    for (const zc of zoneCompounds) {
      result.set(zc, state.state.indexes.zones[zc]?.contentIds);
    }
    return result;
  };
}

/**
 * Create a stable selector that only triggers re-renders when the
 * specific data it selects actually changes.
 *
 * @param selector - The selector function
 * @param equalityFn - Optional equality function for comparing results
 * @returns A memoized selector
 */
export function createStableSelector<T>(
  selector: (state: AppStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): (state: AppStore) => T {
  let lastResult: T;
  let hasLastResult = false;

  return (state: AppStore) => {
    const result = selector(state);

    if (hasLastResult && equalityFn(lastResult, result)) {
      return lastResult;
    }

    lastResult = result;
    hasLastResult = true;
    return result;
  };
}

/**
 * Shallow array equality check for use with selectors.
 */
export function shallowArrayEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}
