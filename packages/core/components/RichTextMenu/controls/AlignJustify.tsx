import { AlignJustify as AlignJustifyIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function AlignJustify() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<AlignJustifyIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setTextAlign("justify").run();
      }}
      disabled={!editorState?.canAlignJustify}
      active={editorState?.isAlignJustify}
      title="Justify"
    />
  );
}
