import { Extensions, JSONContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { ExtensionSet } from "../types";

export function useSyncedEditor<T extends Extensions>({
  content,
  onChange,
  extensions,
  editable = true,
}: {
  content: JSONContent | string;
  onChange: (content: JSONContent | string) => void;
  extensions: ExtensionSet<T>;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    parseOptions: { preserveWhitespace: "full" },
  });

  const [debouncedJson, setDebouncedJson] = useDebounce<JSONContent | string>(
    "",
    200
  );

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      const json = editor.getJSON();
      setDebouncedJson(JSON.parse(JSON.stringify(json)));
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, setDebouncedJson]);

  useEffect(() => {
    if (debouncedJson) {
      onChange(debouncedJson);
    }
  }, [debouncedJson, onChange]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  return editor;
}
