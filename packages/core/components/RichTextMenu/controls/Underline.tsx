import { Underline as UnderlineIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function Underline() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<UnderlineIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleUnderline().run();
      }}
      disabled={!editorState?.canUnderline}
      active={editorState?.isUnderline}
      title="Underline"
    />
  );
}
