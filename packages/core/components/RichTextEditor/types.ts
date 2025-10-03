import { Editor, Extensions, JSONContent } from "@tiptap/react";
import { defaultExtensions } from "./extensions";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { RichTextConfigType } from "../../types";

import type { ReactElement } from "react";

// Generic icon type (Lucide / React component)
type IconType = ReactElement;

// Base menu item
export type RichTextMenuItem = {
  title: string;
  icon: IconType;
  action: (editor: Editor) => void;
  state?: (editor: Editor) => boolean;
  can?: (editor: Editor) => boolean;
};

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Menu config
export interface RichTextMenuConfig {
  alignment: RichTextMenuItem[];
  headings: HeadingLevel[];
  text: RichTextMenuItem[];
  blocks: RichTextMenuItem[];
  breaks: RichTextMenuItem[];
}

export type EditorProps = {
  onChange: (content: string | JSONContent) => void;
  content: string;
  id?: string;
  readOnly?: boolean;
  configOverrides?: Partial<RichTextConfigType>;
  extensionOverrides?: Partial<Extensions[]>;
};

export type DefaultExtensions = typeof defaultExtensions;
export type ExtensionSet<T extends Extensions = DefaultExtensions> = T;

export type RichTextEditor = NonNullable<ReturnType<typeof useSyncedEditor>>;
