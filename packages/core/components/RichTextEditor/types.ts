import { Editor, EditorStateSnapshot, JSONContent } from "@tiptap/react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultEditorState } from "./selector";
import { RichtextField } from "../../types";

export type RichTextSelector = (
  ctx: EditorStateSnapshot
) => Partial<Record<string, boolean>>;

export type DefaultEditorState = ReturnType<typeof defaultEditorState>;

export type EditorState<Selector extends RichTextSelector = RichTextSelector> =
  DefaultEditorState & Selector;

export type EditorProps = {
  onChange: (content: string | JSONContent) => void;
  content: string;
  readOnly?: boolean;
  inline?: boolean;
  field: RichtextField;
  onFocus?: (editor: Editor) => void;
  id: string;
};

export type RichTextEditor = NonNullable<ReturnType<typeof useSyncedEditor>>;
