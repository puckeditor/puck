import { AlignRight as AlignRightIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function AlignRight() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<AlignRightIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setTextAlign("right").run();
      }}
      disabled={!editorState?.canAlignRight}
      active={editorState?.isAlignRight}
      title="Align right"
    />
  );
}
