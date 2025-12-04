import { AlignLeft as AlignLeftIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function AlignLeft() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<AlignLeftIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setTextAlign("left").run();
      }}
      disabled={!editorState?.canAlignLeft}
      active={editorState?.isAlignLeft}
      title="Align left"
    />
  );
}
