import { memo, useCallback, useMemo, KeyboardEvent } from "react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultExtensions } from "./extensions";
import { MenuBar } from "./components/MenuBar";
import { EditorContent, Extensions } from "@tiptap/react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { EditorProps } from "./types";

import { useAppStoreApi } from "../../store";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export const Editor = memo(
  ({
    onChange,
    content,
    readOnly = false,
    field,
    inline = false,
    onFocus,
  }: EditorProps) => {
    const { extensions = [] } = field;

    const loadedExtensions = useMemo(
      () => [...defaultExtensions, ...extensions] as Extensions,
      [extensions]
    );

    const appStoreApi = useAppStoreApi();

    const editor = useSyncedEditor<typeof loadedExtensions>({
      content,
      onChange,
      extensions: loadedExtensions,
      editable: !readOnly,
      onFocusChange: (editor) => {
        if (editor) {
          appStoreApi.setState({
            currentRichText: {
              field,
              editor,
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
        }
      },
      []
    );

    if (!editor) return null;

    return (
      <div onKeyDownCapture={handleHotkeyCapture}>
        {!readOnly && !inline && <MenuBar field={field} editor={editor} />}
        <EditorContent
          editor={editor}
          className={getClassName({ editor: !inline, inline })}
        />
      </div>
    );
  }
);

Editor.displayName = "Editor";
