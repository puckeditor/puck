import { Editor } from "@tiptap/react";
import { RichTextConfigType } from "../../../types";

export function buildEditorState(
  editor: Editor,
  menuConfig: RichTextConfigType["menu"]
) {
  const state: Record<string, boolean> = {};

  Object.values(menuConfig)
    .flat()
    .forEach((item: any) => {
      if (item.state) state[`is${item.title}`] = item.state(editor) ?? false;
      if (item.can) state[`can${item.title}`] = item.can(editor) ?? false;
    });

  return state;
}
