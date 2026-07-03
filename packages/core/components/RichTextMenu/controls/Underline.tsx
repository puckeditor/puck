import { Underline as UnderlineIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useMessage } from "../../../lib/use-message";
import { useControlContext } from "../lib/use-control-context";

export function Underline() {
  const { editor, editorState } = useControlContext();
  const underlineLabel = useMessage("field-richtext-underline");

  return (
    <Control
      icon={<UnderlineIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleUnderline().run();
      }}
      disabled={!editorState?.canUnderline}
      active={editorState?.isUnderline}
      title={underlineLabel}
    />
  );
}
