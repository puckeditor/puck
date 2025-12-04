import type { Editor, EditorStateSnapshot, JSONContent } from "@tiptap/react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultEditorState } from "./selector";
import { RichtextField, UiState } from "../../types";

export type RichTextSelector = (
  ctx: EditorStateSnapshot,
  readOnly: boolean
) => Partial<Record<string, boolean>>;

export type DefaultEditorState = ReturnType<typeof defaultEditorState>;

export type EditorState<Selector extends RichTextSelector = RichTextSelector> =
  DefaultEditorState &
    ReturnType<Selector> &
    Record<string, boolean | undefined>;

export type EditorProps = {
  onChange: (content: string | JSONContent, uiState?: Partial<UiState>) => void;
  content: string;
  readOnly?: boolean;
  inline?: boolean;
  field: RichtextField;
  onFocus?: (editor: Editor) => void;
  id: string;
  name?: string;
};

export type RichTextEditor = NonNullable<ReturnType<typeof useSyncedEditor>>;
