import { ListOrdered as ListOrderedIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function OrderedList() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<ListOrderedIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleOrderedList().run();
      }}
      disabled={!editorState?.canOrderedList}
      active={editorState?.isOrderedList}
      title="Ordered list"
    />
  );
}
