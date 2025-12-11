import { Strikethrough as StrikethroughIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function Strikethrough() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<StrikethroughIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleStrike().run();
      }}
      disabled={!editorState?.canStrike}
      active={editorState?.isStrike}
      title="Strikethrough"
    />
  );
}
