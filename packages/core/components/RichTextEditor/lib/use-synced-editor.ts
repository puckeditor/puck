import { useEditor } from "@tiptap/react";
import type { Extensions, JSONContent, Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { UiState } from "../../../types";
import { useAppStore, useAppStoreApi } from "../../../store";

export function useSyncedEditor({
  content,
  onChange,
  extensions,
  editable = true,
  onFocusChange,
  name,
}: {
  content: JSONContent | string;
  onChange: (content: JSONContent | string, uiState?: Partial<UiState>) => void;
  extensions: Extensions;
  editable?: boolean;
  onFocusChange?: (editor: Editor | null) => void;
  name: string | undefined;
}) {
  const [debouncedState, setDebouncedState] = useDebounce<{
    from: number;
    to: number;
    html: string;
  } | null>(null, 50, {
    leading: true,
    maxWait: 200,
  });

  const syncingRef = useRef(false);
  const lastSyncedRef = useRef("");
  const editTimer = useRef<NodeJS.Timeout>(null);
  const isPending = !!editTimer.current;
  const isFocused = useAppStore((s) => s.state.ui.field.focus === name);

  const resetTimer = (clearOn: string) => {
    if (editTimer.current) {
      clearTimeout(editTimer.current);
    }

    editTimer.current = setTimeout(() => {
      if (lastSyncedRef.current === clearOn) {
        editTimer.current = null;
      }
    }, 200);
  };

  const appStoreApi = useAppStoreApi();

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    parseOptions: { preserveWhitespace: "full" },
    onUpdate: ({ editor }) => {
      // This can trigger during undo/redo history loads
      if (syncingRef.current || !isFocused) {
        appStoreApi.getState().setUi({ field: { focus: name } });

        return;
      }

      const html = editor.getHTML();

      const { from, to } = editor.state.selection;

      setDebouncedState({ from, to, html });
      resetTimer(html);

      lastSyncedRef.current = html;
    },
  });

  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => {
      onFocusChange?.(editor);
    };

    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor, onFocusChange]);

  // Push debounced changes up to parent
  useEffect(() => {
    if (debouncedState) {
      const { ui } = appStoreApi.getState().state;

      onChange(debouncedState.html, {
        field: {
          ...ui.field,
          metadata: { from: debouncedState.from, to: debouncedState.to },
        },
      });
    }
  }, [editor, debouncedState, onChange, appStoreApi, name]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Bring in external content changes without causing flicker on blur
  useEffect(() => {
    if (!editor) return;

    // If the editor currently has pending changes, don't stomp what the user is typing
    if (isPending) {
      return;
    }

    // Compare current doc vs incoming doc; if same, skip
    const current = editor.getHTML();

    if (current === content) return;

    syncingRef.current = true;

    editor.commands.setContent(content, { emitUpdate: false });

    const { ui } = appStoreApi.getState().state;

    if (typeof ui.field.metadata?.from !== "undefined") {
      editor.commands.setTextSelection({
        from: ui.field.metadata.from,
        to: ui.field.metadata.to,
      });
    }

    syncingRef.current = false;
  }, [content, editor, appStoreApi]);

  return editor;
}
