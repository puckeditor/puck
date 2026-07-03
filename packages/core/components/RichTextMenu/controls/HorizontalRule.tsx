import { Minus as MinusIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useMessage } from "../../../lib/use-message";
import { useControlContext } from "../lib/use-control-context";

export function HorizontalRule() {
  const { editor, editorState } = useControlContext();
  const horizontalRuleLabel = useMessage("field-richtext-horizontalrule");

  return (
    <Control
      icon={<MinusIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().setHorizontalRule().run();
      }}
      disabled={!editorState?.canHorizontalRule}
      title={horizontalRuleLabel}
    />
  );
}
