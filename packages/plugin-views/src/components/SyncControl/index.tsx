"use client";

import type { Field } from "@puckeditor/core";

import getClassNameFactory from "../../../../core/lib/get-class-name-factory";

import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import { setNodeViewState } from "../../lib/bindings";
import {
  createDerivedSyncState,
  createManualSyncState,
  getSyncFieldPath,
  isFieldSynced,
  setSyncedFieldValue,
} from "../../lib/bindings/sync";
import { getValueAtPath, getWildcardPathRegExp } from "../../lib/strings/paths";
import {
  getWildcardTemplateExpressions,
  isTemplateString,
} from "../../lib/strings/templates";
import type { NodeViewState, ViewsPluginOptions } from "../../types";

import styles from "./style.module.css";

const getClassName = getClassNameFactory("SyncControl", styles);

const SUPPORTED_SYNC_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "select",
  "radio",
]);

/**
 * Renders the sync toggle for fields nested inside a bound array.
 */
export function SyncControl({
  path,
  field,
  nodeViewState,
  options,
  disabled,
}: {
  path: string;
  field: Field;
  nodeViewState: NodeViewState;
  options: ViewsPluginOptions;
  disabled?: boolean;
}) {
  const { currentProps, replaceProps } = useCurrentNodeEditor();

  if (!SUPPORTED_SYNC_FIELD_TYPES.has(field.type)) {
    return null;
  }

  const syncFieldPath = getSyncFieldPath({
    fieldPath: path,
    bindings: nodeViewState.bindings,
  });

  if (!syncFieldPath) {
    return null;
  }

  const synced = isFieldSynced({
    fieldPath: path,
    nodeState: nodeViewState,
  });
  const syncTemplate = nodeViewState.templates[syncFieldPath];
  const fieldBinding = nodeViewState.bindings[syncFieldPath];
  const currentValue = getValueAtPath(currentProps, path);
  const currentTemplate =
    syncTemplate ||
    nodeViewState.templates[path] ||
    (typeof currentValue === "string" && isTemplateString(currentValue)
      ? currentValue
      : null);
  const isWildcardTemplate =
    Boolean(syncTemplate) &&
    getWildcardTemplateExpressions(syncTemplate).length > 0;

  /**
   * Persists the next component view state.
   */
  const updateNodeState = (
    nextNodeState: NodeViewState,
    nextProps = currentProps
  ) => {
    replaceProps(
      setNodeViewState({
        props: nextProps,
        nodeState: nextNodeState,
        nodeStateKey: options.nodeStateKey,
      })
    );
  };

  return (
    <button
      className={getClassName({ synced })}
      disabled={(disabled && !synced) || isWildcardTemplate}
      onClick={() => {
        const nextNodeState: NodeViewState = {
          bindings: {
            ...nodeViewState.bindings,
          },
          templates: {
            ...nodeViewState.templates,
          },
          synced: {
            ...nodeViewState.synced,
          },
        };

        // Switch to unsynced
        if (synced) {
          // Same as disconnecting a bound field, remove any existing bindings/templates/syncs that would be overridden
          // by the field binding being removed
          if (fieldBinding) {
            Object.keys(nextNodeState.bindings).forEach((bindingKey) => {
              if (bindingKey.startsWith(syncFieldPath)) {
                delete nextNodeState.bindings[bindingKey];
              }
            });
            Object.keys(nextNodeState.templates).forEach((templateKey) => {
              if (templateKey.startsWith(syncFieldPath)) {
                delete nextNodeState.templates[templateKey];
              }
            });
            Object.keys(nextNodeState.synced).forEach((syncedKey) => {
              if (syncedKey.startsWith(syncFieldPath)) {
                delete nextNodeState.synced[syncedKey];
              }
            });

            updateNodeState(nextNodeState);

            return;
          }

          if (syncTemplate) {
            // Persist the unsynced template for this item
            nextNodeState.templates[path] = syncTemplate;

            // Unsync the rest
            delete nextNodeState.templates[syncFieldPath];
          }

          delete nextNodeState.synced[syncFieldPath];

          updateNodeState(nextNodeState);

          return;
        }

        // Switch to synced
        if (currentTemplate) {
          const matchSyncFieldPath = getWildcardPathRegExp(
            syncFieldPath,
            "\\d+"
          );

          // Clear out any templates that the sync items define on their own
          Object.keys(nextNodeState.templates).forEach((templateKey) => {
            if (
              templateKey === syncFieldPath ||
              matchSyncFieldPath.test(templateKey)
            ) {
              delete nextNodeState.templates[templateKey];
            }
          });

          // Persist this field's template on the sync field path so it applies to all items
          nextNodeState.templates[syncFieldPath] = currentTemplate;
        }

        nextNodeState.synced[syncFieldPath] = currentTemplate
          ? createDerivedSyncState()
          : createManualSyncState(currentValue);

        updateNodeState(
          nextNodeState,
          currentTemplate
            ? currentProps
            : // NB: This is repeated work, but it's the only way to ensure the current value is used as the base when fanning out
              setSyncedFieldValue({
                props: currentProps,
                fieldPath: syncFieldPath,
                value: currentValue,
              })
        );
      }}
      type="button"
    >
      {synced ? "Unsync" : "Sync"}
    </button>
  );
}
