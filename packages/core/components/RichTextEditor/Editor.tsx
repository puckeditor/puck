import { memo, useCallback, useMemo, KeyboardEvent } from "react";
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
  }: EditorProps) => {
    const { tiptap = {}, options } = field;
    const { extensions = [] } = tiptap;

    const loadedExtensions = useMemo(
      () => [PuckRichText.configure(options), ...extensions],
      [field, extensions]
    );

    const appStoreApi = useAppStoreApi();

    const isFocused = useAppStore(
      (s) => s.currentRichText?.id === id && inline === s.currentRichText.inline
    );

    const editor = useSyncedEditor({
      content,
      onChange,
      extensions: loadedExtensions,
      editable: !readOnly,

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
          });

          onFocus?.(editor);
        }
      },
      isFocused,
    });

    const handleHotkeyCapture = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "i"
        ) {
          event.stopPropagation();
        }
      },
      []
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

    if (!editor) return null;

    return (
      <div
        className={getClassName({
          editor: !inline,
          inline,
          isFocused,
          disabled: readOnly,
        })}
        onKeyDownCapture={handleHotkeyCapture}
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
