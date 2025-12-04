import { Bold as BoldIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function Bold() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<BoldIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleBold().run();
      }}
      disabled={!editorState?.canBold}
      active={editorState?.isBold}
      title="Bold"
    />
  );
}
