import { useEditorState } from "@tiptap/react";
import { useMemo } from "react";
import {
  EditorState,
  RichTextEditor,
  RichTextSelector,
} from "../RichTextEditor/types";
import { defaultEditorState } from "../RichTextEditor/selector";
import { RichtextField } from "../../types";
import { LoadedRichTextMenuInner } from "./inner";

export const LoadedRichTextMenuFull = ({
  editor,
  field,
  readOnly,
  inline,
}: {
  field: RichtextField;
  editor: RichTextEditor | null;
  readOnly: boolean;
  inline?: boolean;
}) => {
  const { tiptap = {} } = field;
  const { selector } = tiptap;

  const resolvedSelector = useMemo(() => {
    return (ctx: Parameters<RichTextSelector>[0]) => ({
      ...defaultEditorState(ctx, readOnly),
      ...(selector ? selector(ctx, readOnly) : {}),
    });
  }, [selector, readOnly]);

  const editorState = useEditorState<EditorState>({
    editor,
    selector: resolvedSelector,
  });

  if (!editor || !editorState) {
    return null;
  }

  return (
    <LoadedRichTextMenuInner
      editor={editor}
      editorState={editorState}
      field={field}
      readOnly={readOnly}
      inline={inline}
    />
  );
};
