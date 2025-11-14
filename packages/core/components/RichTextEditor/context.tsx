"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  RefObject,
  useEffect,
} from "react";
import type { Editor } from "@tiptap/react";
import { useAppStore } from "../../store";

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
  const selectedItem = useAppStore((s) => s.selectedItem);
  const selectedPortal = useAppStore((s) => s.selectedPortal);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editorMap = useRef<Record<Editor["instanceId"], string>>({});
  const [currentInlineId, setCurrentInlineId] = useState<string | null>(null);
  const debug = false;

  useEffect(() => {
    const idExists =
      selectedPortal &&
      Object.values(editorMap.current).includes(selectedPortal);
    !idExists && setCurrentInlineId(null);
  }, [selectedItem, selectedPortal]);

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
