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
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editorMap = useRef<Record<Editor["instanceId"], string>>({});

  return (
    <EditorContext.Provider
      value={{ activeEditor, setActiveEditor, editorMap }}
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
