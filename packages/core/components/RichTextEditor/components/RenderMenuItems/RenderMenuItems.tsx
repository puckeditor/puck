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
    <Fragment key={key}>{menuItem.render(editor, editorState)}</Fragment>
  ));
};
