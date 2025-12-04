import { createContext, useContext } from "react";
import { EditorState } from "../../RichTextEditor/types";
import type { Editor } from "@tiptap/react";
import type { PuckRichTextOptions } from "../../RichTextEditor/extension";

type ControlContextType = {
  editor: Editor | null;
  editorState: EditorState | null;
  inline: boolean;
  readOnly: boolean;
  options?: Partial<PuckRichTextOptions>;
};

export const ControlContext = createContext<Partial<ControlContextType>>({});

export const useControlContext = () => {
  return useContext(ControlContext) as ControlContextType;
};
