import { useEditorState } from "@tiptap/react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { RenderMenuItems } from "../RenderMenuItems/RenderMenuItems";
import { Loader } from "../../../Loader";
import { useMemo } from "react";
import {
  EditorState,
  RichTextEditor,
  RichTextMenuItem,
  RichTextSelector,
} from "../../types";
import { defaultEditorState } from "../../selector";
const getClassName = getClassNameFactory("MenuBar", styles);

export const MenuBar = ({
  menuConfig,
  editor,
  selector,
}: {
  menuConfig: Record<string, Record<string, RichTextMenuItem>>;
  editor: RichTextEditor | null;
  selector?: RichTextSelector;
}) => {
  const resolvedSelector = useMemo(() => {
    return (ctx: Parameters<RichTextSelector>[0]) => ({
      ...defaultEditorState(ctx),
      ...(selector ? selector(ctx) : {}),
    });
  }, [selector]);

  const editorState = useEditorState<EditorState>({
    editor,
    selector: resolvedSelector,
  });

  const menuGroups = useMemo(() => Object.keys(menuConfig), [menuConfig]);

  if (!editor) {
    return <Loader />;
  }

  if (!editorState) {
    return <Loader />;
  }

  if (menuGroups.length === 0) {
    return null;
  }

  return (
    <div className={getClassName("button-group")}>
      {menuGroups.map((key) => {
        const menuItems = menuConfig[key];
        if (!menuItems) return null; // handle undefined in Partial
        if (Object.keys(menuItems).length === 0) return null;
        return (
          <div key={String(key)} className={getClassName(`menu`)}>
            <RenderMenuItems
              menuItems={menuItems}
              editor={editor}
              editorState={editorState}
            />
          </div>
        );
      })}
    </div>
  );
};
