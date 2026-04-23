import type { NodeViewState, NodeViewSync } from "../../types";

import assignPathBinding from "../assign-path-binding";
import {
  getPathSegments,
  getPathString,
  getPathToClosestWildcard,
} from "../strings/paths";
import cloneObject from "../utils/clone-object";
import { getWildcardFieldPath } from "../views";

/**
 * Creates sync state for values that are manually kept in sync by the "synced" resolver (don't contain templates or bindings).
 *
 * The stored value acts as the resolver's copy of the shared value so it can detect which field is being edited
 * and fan the new value back out to the other synced items (Puck's lastData is not reliable for this).
 */
export const createManualSyncState = (value: unknown): NodeViewSync => ({
  type: "manual",
  value,
});

/**
 * Creates sync state for values whose shared props is resolved from a
 * binding or wildcard template.
 */
export const createDerivedSyncState = (): NodeViewSync => ({
  type: "derived",
});

/**
 * Checks whether a sync entry is manual (should be fanned out by the sync resolver),
 * or derived (should be updated by the bindings or templates resolver).
 */
export const isManualSyncState = (
  sync: NodeViewSync | undefined
): sync is Extract<NodeViewSync, { type: "manual" }> => sync?.type === "manual";

/**
 * Gets the wildcard field path that should be used as the shared sync key for a given static field path.
 *
 * i.g. for a field path of `arrayField[0].title` and a binding on `arrayField[*]`, this would return `arrayField[*].title`.
 *
 * Sync only makes sense inside an already bound array, so this returns `null` when the field is not nested under a wildcard binding.
 *
 * @param fieldPath The concrete field path currently being edited
 * @param bindings The node's current view-state bindings
 * @returns The wildcard storage path for the sync state, or `null` if none applies
 */
export const getSyncFieldPath = ({
  fieldPath,
  bindings,
}: {
  fieldPath: string;
  bindings: NodeViewState["bindings"];
}) => {
  const closestArrayBindingKey = getPathToClosestWildcard(
    fieldPath,
    Object.keys(bindings)
  );

  if (!closestArrayBindingKey) {
    return null;
  }

  return getWildcardFieldPath({ fieldPath, bindings });
};

/**
 * Converts a wildcard field path into a concrete one so it can be validated
 * against the current props tree.
 *
 * @param fieldPath The wildcard field path to normalize
 * @returns The same path with every wildcard replaced by index `0`
 */
export const getConcreteFieldPath = (fieldPath: string) =>
  fieldPath.replace(/\[\*\]/g, "[0]");

/**
 * Checks whether a field is currently participating in shared array-item sync.
 *
 * A field is considered synced when it is explicitly marked as synced, directly
 * bound, or backed by a wildcard-stored template.
 *
 * @param fieldPath The static field path being inspected (i.g. `arrayField[0].title`)
 * @param nodeState The node's current view state
 * @returns Whether the field should behave as shared across bound array items
 */
export const isFieldSynced = ({
  fieldPath,
  nodeState,
}: {
  fieldPath: string;
  nodeState: NodeViewState;
}) => {
  const syncFieldPath = getSyncFieldPath({
    fieldPath,
    bindings: nodeState.bindings,
  });

  if (!syncFieldPath) {
    return false;
  }

  return Boolean(
    nodeState.bindings[syncFieldPath] ||
      nodeState.templates[syncFieldPath] ||
      nodeState.synced[syncFieldPath]
  );
};

/**
 * Verifies that a stored sync key still matches the currently active array
 * binding context.
 *
 * This is used to prune stale sync entries when bindings are removed or a
 * deeper array binding becomes the new wildcard ancestor.
 *
 * @param fieldPath The stored wildcard sync path
 * @param bindings The node's current view-state bindings
 * @returns Whether the sync key still points at the active bound array context
 */
export const isValidSyncFieldPath = ({
  fieldPath,
  bindings,
}: {
  fieldPath: string;
  bindings: NodeViewState["bindings"];
}) =>
  getSyncFieldPath({
    fieldPath: getConcreteFieldPath(fieldPath),
    bindings,
  }) === fieldPath;

/**
 * Copies one concrete value across all items matched by a synced wildcard path.
 *
 * @param props The current node props
 * @param fieldPath The wildcard field path that should share one value
 * @param value The value that should be written to every matched item
 * @returns A cloned props object with the synced value applied
 */
export const setSyncedFieldValue = ({
  props,
  fieldPath,
  value,
}: {
  props: Record<string, any>;
  fieldPath: string;
  value: any;
}) => {
  const nextProps = cloneObject(props);

  assignPathBinding(
    {
      value: nextProps,
      pathSegments: getPathSegments(fieldPath),
    },
    {
      value: {
        value,
      },
      pathSegments: ["value"],
    }
  );

  return nextProps;
};

/**
 * Expands a wildcard sync path into the static field entries it currently
 * matches in the props tree.
 *
 * This lets the resolver compare the current concrete items against the stored
 * manual sync baseline before fanning the winning value back out.
 *
 * TODO: This might not be performant for large deeply nested arrays
 * we should do the check at the same time that we iterate. In theory it still is O(n) where n is the number of matched items,
 * but it would save us from having to iterate twice and cloning the props if we find a mismatch early on.
 *
 * @param fieldPath The wildcard sync path to expand
 * @param props The props tree to inspect
 * @returns The concrete matched paths and their current values
 */
export const getConcreteSyncFieldEntries = ({
  fieldPath,
  props,
}: {
  fieldPath: string;
  props: Record<string, any>;
}) => {
  const entries: { path: string; value: any }[] = [];
  const pathSegments = getPathSegments(fieldPath);

  const walk = (value: any, currentIndex: number, currentPath: string[]) => {
    if (currentIndex >= pathSegments.length) {
      entries.push({
        path: getPathString(currentPath),
        value,
      });

      return;
    }

    const segment = pathSegments[currentIndex];

    if (segment === "[*]") {
      if (!Array.isArray(value)) {
        return;
      }

      value.forEach((item, index) => {
        walk(item, currentIndex + 1, [...currentPath, `[${index}]`]);
      });

      return;
    }

    if (segment.startsWith("[")) {
      if (!Array.isArray(value)) {
        return;
      }

      walk(value[Number(segment.slice(1, -1))], currentIndex + 1, [
        ...currentPath,
        segment,
      ]);

      return;
    }

    if (typeof value === "undefined" || value === null) {
      return;
    }

    walk(value[segment], currentIndex + 1, [...currentPath, segment]);
  };

  walk(props, 0, []);

  return entries;
};

/**
 * Checks whether every concrete item currently matched by a sync path already
 * shares the same value.
 *
 * If they don't it returns the first one that diverges from the others
 */
export const areConcreteSyncFieldEntriesEqual = (entries: { value: any }[]) =>
  entries.every(({ value }) => Object.is(value, entries[0]?.value));
