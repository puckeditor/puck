import { List as ListIcon } from "lucide-react";
import { Control } from "../components/Control";
import { useControlContext } from "../lib/use-control-context";

export function BulletList() {
  const { editor, editorState } = useControlContext();

  return (
    <Control
      icon={<ListIcon />}
      onClick={(e) => {
        e.stopPropagation();
        editor?.chain().focus().toggleBulletList().run();
      }}
      disabled={!editorState?.canBulletList}
      active={editorState?.isBulletList}
      title="Bullet list"
    />
  );
}
