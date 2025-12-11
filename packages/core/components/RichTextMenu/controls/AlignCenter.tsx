import { AlignCenter as AlignCenterIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function AlignCenter() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<AlignCenterIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setTextAlign("center").run();
      }}
      disabled={!editorState?.canAlignCenter}
      active={editorState?.isAlignCenter}
      title="Align center"
    />
  );
}
