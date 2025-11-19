import { EditorState, RichTextEditor, RichTextMenuItem } from "../../types";
import { Fragment } from "react";

export const RenderMenuItems = ({
  menuItems,
  editorState,
  editor,
}: {
  menuItems: Record<string, RichTextMenuItem>;
  editorState: EditorState;
  editor: RichTextEditor;
}) => {
  return Object.entries(menuItems).map(([key, menuItem]) => (
    <span key={key} data-rte-menu>
      {menuItem.render(editor, editorState)}
    </span>
  ));
};
