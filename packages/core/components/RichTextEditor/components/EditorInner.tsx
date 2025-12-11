/** Inner component. Should not contain any tiptap imports (except for types) */

import {
  memo,
  ReactNode,
  useCallback,
  KeyboardEvent,
  FocusEventHandler,
} from "react";
import styles from "../styles.module.css";
import getClassNameFactory from "../../../lib/get-class-name-factory";
import { EditorProps } from "../types";
import type { Editor } from "@tiptap/core";
import { useAppStore, useAppStoreApi } from "../../../store";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export const EditorInner = memo(
  ({
    children,
    menu,
    readOnly = false,
    field,
    inline = false,
    editor,
    id,
  }: EditorProps & {
    children: ReactNode;
    menu: ReactNode;
    editor: Editor | null;
  }) => {
    const { initialHeight } = field;

    const isActive = useAppStore(
      (s) => s.currentRichText?.id === id && inline === s.currentRichText.inline
    );

    const appStoreApi = useAppStoreApi();

    const handleHotkeyCapture = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "i"
        ) {
          event.stopPropagation();

          // Stop Safari from capturing key binding
          event.preventDefault();
          editor?.commands.toggleItalic?.();
        }
      },
      [editor]
    );

    const handleBlur = useCallback<FocusEventHandler<HTMLDivElement>>(
      (e) => {
        const targetInMenu = !!e.relatedTarget?.closest?.(
          "[data-puck-rte-menu]"
        );

        if (e.relatedTarget && !targetInMenu) {
          appStoreApi.setState({
            currentRichText: null,
          });
        } else {
          e.stopPropagation();
        }
      },
      [appStoreApi]
    );

    return (
      <div
        className={getClassName({
          editor: !inline,
          inline,
          isActive,
          disabled: readOnly,
        })}
        style={
          inline ? {} : { height: initialHeight ?? 192, overflowY: "auto" }
        }
        onKeyDownCapture={handleHotkeyCapture}
        onBlur={handleBlur}
      >
        {!inline && <div className={getClassName("menu")}>{menu}</div>}
        {children}
      </div>
    );
  }
);

EditorInner.displayName = "EditorInner";
