import { Italic as ItalicIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function Italic() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<ItalicIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleItalic().run();
      }}
      disabled={!editorState?.canItalic}
      active={editorState?.isItalic}
      title="Italic"
    />
  );
}
