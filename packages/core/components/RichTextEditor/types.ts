import {
  Editor,
  EditorStateSnapshot,
  Extensions,
  JSONContent,
} from "@tiptap/react";
import { useSyncedEditor } from "./lib/use-synced-editor";

import type { ReactElement } from "react";
import { defaultEditorState } from "./selector";
import { RichtextField } from "../../types";
import { createDefaultControls } from "./controls";

// Base menu item
export type RichTextMenuItem = {
  render: (editor: Editor, editorState: EditorState) => ReactElement;
};

type ControlKey = keyof ReturnType<typeof createDefaultControls>;

// Menu config
export type RichTextMenuConfig = Record<string, ControlKey[]>; // TODO needs typing

export type RichTextControls = Record<string, RichTextMenuItem>;

export type RichTextSelector = (
  ctx: EditorStateSnapshot
) => Partial<Record<string, boolean>>;

export type DefaultEditorState = ReturnType<typeof defaultEditorState>;
type CustomEditorState = ReturnType<RichTextSelector>;

export type EditorState = DefaultEditorState & CustomEditorState;

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
