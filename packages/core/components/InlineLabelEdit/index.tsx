"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";
import { useAppStore } from "../../store";
import { getComponentLabel } from "../../lib/data/get-component-label";
import { useMessage } from "../../lib/use-message";

const getClassName = getClassNameFactory("InlineLabelEdit", styles);

/**
 * Component label editor that reads from the Puck store and dispatches
 * `setComponentLabel` automatically.
 *
 * When `componentId` is omitted or the node is not found nothing is rendered.
 *
 * Usage:
 * ```tsx
 * <!-- Default rendering (label as plain text) -->
 * <InlineLabelEdit componentId={id} />
 *
 * <!-- Custom rendering via render-prop -->
 * <InlineLabelEdit componentId={id}>
 *   {({ label }) => <ActionBar.Label label={label} />}
 * </InlineLabelEdit>
 * ```
 */
export const InlineLabelEdit = ({
  componentId,
  children,
}: {
  componentId?: string;
  children?: (params: { label: string }) => ReactNode;
}) => {
  const nodeData = useAppStore((s) =>
    componentId ? s.state.indexes.nodes[componentId]?.data : undefined
  );
  const config = useAppStore((s) => s.config);
  const dispatch = useAppStore((s) => s.dispatch);
  const label =
    nodeData && "type" in nodeData ? getComponentLabel(nodeData, config) : "";

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const renameMsg = useMessage("label-rename");
  const inputRef = useRef<HTMLInputElement>(null);

  const saveLabel = useCallback(() => {
    const trimmed = editValue.trim();

    if (componentId) {
      dispatch({
        type: "setComponentLabel",
        id: componentId,
        label: trimmed || undefined,
      });
    }

    setIsEditing(false);
  }, [editValue, componentId, dispatch]);

  const cancelEdit = useCallback(() => {
    setEditValue(label);
    setIsEditing(false);
  }, [label]);

  const startEditing = useCallback(() => {
    setEditValue(label);
    setIsEditing(true);
  }, [label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!componentId || !nodeData || !("type" in nodeData)) return null;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={getClassName("input")}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={saveLabel}
        onKeyDown={(e) => {
          // Stop propagation so global hotkeys (e.g. Backspace → delete
          // component) don't fire while the user is editing a label.
          e.stopPropagation();

          if (e.key === "Enter") {
            saveLabel();
          } else if (e.key === "Escape") {
            cancelEdit();
          }
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={startEditing}
      title={renameMsg}
      className={getClassName("label")}
    >
      {typeof children === "function" ? children({ label }) : label}
    </span>
  );
};
