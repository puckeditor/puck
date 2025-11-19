import {
  Editor,
  EditorStateSnapshot,
  Extensions,
  JSONContent,
} from "@tiptap/react";
import { defaultExtensions } from "./extensions";
import { useSyncedEditor } from "./lib/use-synced-editor";

import type { ReactElement } from "react";
import { defaultEditorState } from "./selector";
import { RichtextField } from "../../types";

// Base menu item
export type RichTextMenuItem = {
  render: (editor: Editor, editorState: EditorState) => ReactElement;
};

// Menu config
export type RichTextMenuConfig = Record<string, string[]>;

export type RichTextControls = Record<string, RichTextMenuItem>;

export type RichTextSelectOptions =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

export type RichTextSelector = (
  ctx: EditorStateSnapshot
) => Partial<Record<string, boolean>>;

export type DefaultEditorState = ReturnType<typeof defaultEditorState>;
type CustomEditorState = ReturnType<RichTextSelector>;

export type EditorState = DefaultEditorState & CustomEditorState;

export type EditorProps = {
  onChange: (content: string | JSONContent) => void;
  content: string;
  id: string;
  readOnly?: boolean;
  inline?: boolean;
  field: RichtextField;
  onFocus?: (editor: Editor) => void;
};

export type DefaultExtensions = typeof defaultExtensions;
export type ExtensionSet<T extends Extensions = DefaultExtensions> = T;

export type RichTextEditor = NonNullable<ReturnType<typeof useSyncedEditor>>;
