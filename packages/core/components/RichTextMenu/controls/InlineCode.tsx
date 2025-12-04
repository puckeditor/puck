import { Code as CodeIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function InlineCode() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<CodeIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleCode().run();
      }}
      disabled={!editorState?.canInlineCode}
      active={editorState?.isInlineCode}
      title="Inline code"
    />
  );
}
