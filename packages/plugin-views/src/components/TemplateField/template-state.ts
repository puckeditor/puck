import {
  createDerivedSyncState,
  createManualSyncState,
  getSyncFieldPath,
  isFieldSynced,
} from "../../lib/bindings/sync";
import {
  getTemplateStorageKey,
  isValidTemplateForFieldPath,
} from "../../lib/bindings/templates";
import {
  isTemplateString,
  getWildcardFieldPath,
} from "../../lib/strings/templates";
import type { NodeViewState } from "../../types";

/**
 * Returns the next node state for a text field edit that may add, remove, or
 * keep a template (that might live inside a bound array).
 *
 * When a template stops owning the field we keep the sync active by
 * switching it to manual mode and seeding the authored value as the new
 * baseline in the synced state.
 */
export const getNextTemplateState = ({
  fieldPath,
  currentNodeState,
  nextValue,
}: {
  fieldPath: string;
  currentNodeState: NodeViewState;
  nextValue: string;
}) => {
  const nextNodeState: NodeViewState = {
    templates: {
      ...currentNodeState.templates,
    },
    bindings: {
      ...currentNodeState.bindings,
    },
    synced: {
      ...currentNodeState.synced,
    },
  };

  const currentWildcardFieldPath = getWildcardFieldPath({
    fieldPath,
    bindings: currentNodeState.bindings,
  });
  const syncFieldPath = getSyncFieldPath({
    fieldPath,
    bindings: currentNodeState.bindings,
  });
  const isCurrentlySynced =
    !!syncFieldPath &&
    isFieldSynced({
      fieldPath,
      nodeState: currentNodeState,
    });

  delete nextNodeState.templates[fieldPath];
  delete nextNodeState.templates[currentWildcardFieldPath];

  // If the new value is a template persist it to state
  if (
    isTemplateString(nextValue) &&
    isValidTemplateForFieldPath({
      fieldPath,
      template: nextValue,
      bindings: currentNodeState.bindings,
    })
  ) {
    const templateStorageKey = getTemplateStorageKey({
      fieldPath,
      template: nextValue,
      bindings: currentNodeState.bindings,
      isSynced: isCurrentlySynced,
    });

    nextNodeState.templates[templateStorageKey] = nextValue;

    // The template might not be synced yet, but if the storage key for it
    // matches the sync field path it means it will (it uses wildcards), so we need to flag it as derived right away
    if (syncFieldPath && templateStorageKey === syncFieldPath) {
      nextNodeState.synced[syncFieldPath] = createDerivedSyncState();
    }

    return nextNodeState;
  }

  // If the field was previously a template and it was synced but the new value is not a valid template,
  // switch to manual sync to keep the existing shared value alive and prevent it from getting out of sync across array items.
  // This allows users to start with a template, then switch to a concrete value without losing the shared state.
  if (
    syncFieldPath &&
    isCurrentlySynced &&
    currentNodeState.synced[syncFieldPath]?.type === "derived"
  ) {
    nextNodeState.synced[syncFieldPath] = createManualSyncState(nextValue);
  }

  return nextNodeState;
};
