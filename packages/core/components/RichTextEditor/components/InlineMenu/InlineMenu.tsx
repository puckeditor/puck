import { useMemo } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Loader } from "../../../Loader";

import { MenuBar } from "../MenuBar/MenuBar";
import {
  RichTextEditor,
  RichTextMenuItem,
  RichTextSelector,
} from "../../types";

export const InlineMenu = ({
  menuConfig,
  editor,
  selector,
}: {
  menuConfig: Record<string, Record<string, RichTextMenuItem>>;
  editor: RichTextEditor | null;
  selector?: RichTextSelector;
}) => {
  const menuGroups = useMemo(() => Object.keys(menuConfig), [menuConfig]);

  if (!editor) {
    return <Loader />;
  }

  if (menuGroups.length === 0) {
    return null;
  }
  return (
    <BubbleMenu editor={editor}>
      <MenuBar menuConfig={menuConfig} editor={editor} selector={selector} />
    </BubbleMenu>
  );
};
