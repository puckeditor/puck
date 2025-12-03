import {
  memo,
  useCallback,
  useMemo,
  KeyboardEvent,
  FocusEventHandler,
} from "react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { PuckRichText } from "./extensions";
import { EditorContent } from "@tiptap/react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { EditorProps } from "./types";
import { useAppStore, useAppStoreApi } from "../../store";
import { LoadedRichTextMenu } from "../RichTextMenu";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export const Editor = memo(
  ({
    onChange,
    content,
    readOnly = false,
    field,
    inline = false,
    onFocus,
    id,
    name,
  }: EditorProps) => {
    const { initialHeight, tiptap = {}, options } = field;
    const { extensions = [] } = tiptap;

    const loadedExtensions = useMemo(
      () => [PuckRichText.configure(options), ...extensions],
      [field, extensions]
    );

    const appStoreApi = useAppStoreApi();

    const isActive = useAppStore(
      (s) => s.currentRichText?.id === id && inline === s.currentRichText.inline
    );

    const focusName = `${name}${inline ? "::inline" : ""}`;

    const editor = useSyncedEditor({
      content,
      onChange,
      extensions: loadedExtensions,
      editable: !readOnly,
      name: focusName,
      onFocusChange: (editor) => {
        if (editor) {
          const s = appStoreApi.getState();

          appStoreApi.setState({
            currentRichText: {
              field,
              editor,
              id,
              inline,
            },
            state: {
              ...s.state,
              ui: {
                ...s.state.ui,
                field: {
                  ...s.state.ui.field,
                  focus: focusName,
                },
              },
            },
          });

          onFocus?.(editor);
        }
      },
    });

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

    const menuEditor = useAppStore((s) => {
      if (
        !inline &&
        s.currentRichText?.id === id &&
        s.currentRichText?.inlineComponentId
      ) {
        return s.currentRichText.editor;
      }

      return editor;
    });

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

    if (!editor) return null;

    return (
      <div
        className={getClassName({
          editor: !inline,
          inline,
          isActive,
          disabled: readOnly,
        })}
        onKeyDownCapture={handleHotkeyCapture}
        style={
          inline ? {} : { height: initialHeight ?? 256, overflowY: "auto" }
        }
        onBlur={handleBlur}
      >
        {!inline && (
          <div className={getClassName("menu")}>
            <LoadedRichTextMenu
              field={field}
              editor={menuEditor}
              readOnly={readOnly}
            />
          </div>
        )}
        <EditorContent editor={editor} className="rich-text" />
      </div>
    );
  }
);

Editor.displayName = "Editor";
