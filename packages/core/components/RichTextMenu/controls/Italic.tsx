import { Italic as ItalicIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useMessage } from "../../../lib/use-message";
import { useControlContext } from "../lib/use-control-context";

export function Italic() {
  const { editor, editorState } = useControlContext();
  const italicLabel = useMessage("field-richtext-italic");

  return (
    <Control
      icon={<ItalicIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleItalic().run();
      }}
      disabled={!editorState?.canItalic}
      active={editorState?.isItalic}
      title={italicLabel}
    />
  );
}
