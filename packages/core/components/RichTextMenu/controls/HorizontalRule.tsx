import { Minus as MinusIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function HorizontalRule() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<MinusIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setHorizontalRule().run();
      }}
      disabled={!editorState?.canHorizontalRule}
      title="Horizontal rule"
    />
  );
}
