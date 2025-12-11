import { Quote as QuoteIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function Blockquote() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<QuoteIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleBlockquote().run();
      }}
      disabled={!editorState?.canBlockquote}
      active={editorState?.isBlockquote}
      title="Blockquote"
    />
  );
}
