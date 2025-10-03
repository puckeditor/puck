import { useEditorState } from "@tiptap/react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { BlockStyleSelect } from "../BlockStyleSelect/BlockStyleSelect";
import { renderButtons } from "../../lib/render-buttons";
import { Loader } from "../../../Loader";
import { buildEditorState } from "../../lib/build-editor-state";
import { useMemo } from "react";
import {
  HeadingLevel,
  RichTextEditor,
  RichTextMenuConfig,
  RichTextMenuItem,
} from "../../types";
const getClassName = getClassNameFactory("MenuBar", styles);

export const MenuBar = ({
  menuConfig,
  editor,
}: {
  menuConfig: Partial<RichTextMenuConfig>;
  editor: RichTextEditor | null;
}) => {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      const { editor } = ctx;
      if (!editor) return null;
      return buildEditorState(editor, menuConfig);
    },
  });

  const menuItems = useMemo(
    () => Object.keys(menuConfig) as (keyof RichTextMenuConfig)[],
    [menuConfig]
  );

  if (!editor || !editorState) {
    return <Loader />;
  }

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div className={getClassName("button-group")}>
      {menuItems.map((key) => {
        const configItem = menuConfig[key];
        if (!configItem) return null; // handle undefined in Partial

        if (key === "headings") {
          return (
            <BlockStyleSelect
              key={key}
              config={configItem as HeadingLevel[]}
              editor={editor}
            />
          );
        } else {
          return (
            <div key={String(key)} className={getClassName(`menu-${key}`)}>
              {renderButtons(
                configItem as RichTextMenuItem[],
                editorState,
                editor
              )}
            </div>
          );
        }
      })}
    </div>
  );
};
