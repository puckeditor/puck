import { ListOrdered as ListOrderedIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useMessage } from "../../../lib/use-message";
import { useControlContext } from "../lib/use-control-context";

export function OrderedList() {
  const { editor, editorState } = useControlContext();
  const orderedListLabel = useMessage("field-richtext-list-ordered");

  return (
    <Control
      icon={<ListOrderedIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleOrderedList().run();
      }}
      disabled={!editorState?.canOrderedList}
      active={editorState?.isOrderedList}
      title={orderedListLabel}
    />
  );
}
