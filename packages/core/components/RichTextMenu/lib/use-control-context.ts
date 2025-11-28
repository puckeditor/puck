import { createContext, useContext } from "react";
import { EditorState } from "../../RichTextEditor/types";
import { Editor } from "@tiptap/react";
import { PuckRichTextOptions } from "../../RichTextEditor/extensions";

type ControlContextType = {
  editor: Editor;
  editorState: EditorState;
  inline: boolean;
  options?: Partial<PuckRichTextOptions>;
};

export const ControlContext = createContext<Partial<ControlContextType>>({});

export const useControlContext = () => {
  return useContext(ControlContext) as ControlContextType;
};
