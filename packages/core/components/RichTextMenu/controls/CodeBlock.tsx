import { SquareCode as SquareCodeIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function CodeBlock() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<SquareCodeIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleCodeBlock().run();
      }}
      disabled={!editorState?.canCodeBlock}
      active={editorState?.isCodeBlock}
      title="Code block"
    />
  );
}
