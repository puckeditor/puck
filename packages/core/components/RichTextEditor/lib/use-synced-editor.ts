import { Extensions, JSONContent, useEditor, Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { ExtensionSet } from "../types";
import { useActiveEditor } from "../context";

export function useSyncedEditor<T extends Extensions>({
  content,
  onChange,
  extensions,
  editable = true,
  onFocusChange,
}: {
  content: JSONContent | string;
  onChange: (content: JSONContent | string) => void;
  extensions: ExtensionSet<T>;
  editable?: boolean;
  onFocusChange?: (editor: Editor | null) => void;
}) {
  const [debouncedJson, setDebouncedJson] = useDebounce<JSONContent | string>(
    "",
    50
  );

  const syncingRef = useRef(false);
  const lastSerialized = useRef<string | null>(null);

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    parseOptions: { preserveWhitespace: "full" },
    onUpdate: ({ editor }) => {
      if (syncingRef.current) return;
      const json = editor.getJSON();
      const serialized = JSON.stringify(json);
      lastSerialized.current = serialized;
      setDebouncedJson(JSON.parse(serialized));
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
    if (debouncedJson) {
      onChange(debouncedJson);
    }
  }, [debouncedJson, onChange]);

  // Bring in external content changes without causing flicker on blur
  useEffect(() => {
    if (!editor) return;

    // If the editor currently has focus, don't stomp what the user is typing
    if (editor.isFocused) return;

    // Compare current doc vs incoming doc; if same, skip
    const currentJSON = editor.getJSON();
    const current = JSON.stringify(currentJSON);

    const incoming =
      typeof content === "string" ? content : JSON.stringify(content);

    if (current === incoming || incoming === lastSerialized.current) return;

    syncingRef.current = true;
    editor.commands.setContent(content, { emitUpdate: false });
    syncingRef.current = false;
  }, [content, editor]);

  return editor;
}
