"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import type { Editor } from "@tiptap/react";

type EditorContextType = {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  return (
    <EditorContext.Provider value={{ activeEditor, setActiveEditor }}>
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
