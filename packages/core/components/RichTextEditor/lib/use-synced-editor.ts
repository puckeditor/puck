import { Extensions, JSONContent, useEditor, Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";

export function useSyncedEditor({
  content,
  onChange,
  extensions,
  editable = true,
  onFocusChange,
  isFocused,
}: {
  content: JSONContent | string;
  onChange: (content: JSONContent | string) => void;
  extensions: Extensions;
  editable?: boolean;
  onFocusChange?: (editor: Editor | null) => void;
  isFocused: boolean;
}) {
  const [debouncedHtml, setDebouncedHtml] = useDebounce<string>("", 50, {
    leading: true,
    maxWait: 200,
  });

  const syncingRef = useRef(false);
  const lastContent = useRef<string | null>(null);

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    parseOptions: { preserveWhitespace: "full" },
    onUpdate: ({ editor }) => {
      if (syncingRef.current) return;
      const html = editor.getHTML();
      lastContent.current = html;
      setDebouncedHtml(html);
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
    if (debouncedHtml) {
      onChange(debouncedHtml);
    }
  }, [debouncedHtml, onChange]);

  // Bring in external content changes without causing flicker on blur
  useEffect(() => {
    if (!editor) return;

    // If the editor currently has focus, don't stomp what the user is typing
    if (isFocused) {
      return;
    }

    // Compare current doc vs incoming doc; if same, skip
    const current = editor.getHTML();

    if (current === content || content === lastContent.current) return;

    syncingRef.current = true;
    editor.commands.setContent(content, { emitUpdate: false });
    syncingRef.current = false;
  }, [content, editor, isFocused]);

  return editor;
}
