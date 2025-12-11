import { memo, useMemo } from "react";
import { useSyncedEditor } from "../lib/use-synced-editor";
import { PuckRichText } from "../extension";
import { EditorContent } from "@tiptap/react";
import { EditorProps } from "../types";
import { useAppStore, useAppStoreApi } from "../../../store";
import { LoadedRichTextMenu } from "../../RichTextMenu";
import { EditorInner } from "./EditorInner";

export const Editor = memo((props: EditorProps) => {
  const {
    onChange,
    content,
    readOnly = false,
    field,
    inline = false,
    onFocus,
    id,
    name,
  } = props;

  const { tiptap = {}, options } = field;
  const { extensions = [] } = tiptap;

  const loadedExtensions = useMemo(
    () => [PuckRichText.configure(options), ...extensions],
    [field, extensions]
  );

  const appStoreApi = useAppStoreApi();

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
    <EditorInner
      {...props}
      editor={editor}
      menu={
        <LoadedRichTextMenu
          field={field}
          editor={menuEditor}
          readOnly={readOnly}
        />
      }
    >
      <EditorContent editor={editor} className="rich-text" />
    </EditorInner>
  );
});

Editor.displayName = "Editor";
