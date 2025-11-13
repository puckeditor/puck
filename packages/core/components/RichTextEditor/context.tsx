"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  RefObject,
} from "react";
import type { Editor } from "@tiptap/react";

type EditorContextType = {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
  editorMap: RefObject<Record<Editor["instanceId"], string>>;
  currentInlineId: string | null;
  setCurrentInlineId: (id: string | null) => void;
  debug: boolean;
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editorMap = useRef<Record<Editor["instanceId"], string>>({});
  const [currentInlineId, setCurrentInlineId] = useState<string | null>(null);
  const debug = false;

  return (
    <EditorContext.Provider
      value={{
        activeEditor,
        setActiveEditor,
        editorMap,
        currentInlineId,
        setCurrentInlineId,
        debug,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useActiveEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx)
    throw new Error("useActiveEditor must be used within an <EditorProvider>");
  return ctx;
}
