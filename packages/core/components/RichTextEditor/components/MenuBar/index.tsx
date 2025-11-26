import { Editor, useEditorState } from "@tiptap/react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { RenderMenuItems } from "../RenderMenuItems/RenderMenuItems";
import { useMemo } from "react";
import {
  EditorState,
  RichTextEditor,
  RichTextMenuConfig,
  RichTextSelector,
} from "../../types";
import { defaultEditorState } from "../../selector";
import { RichtextField } from "../../../../types";
import { useAppStore } from "../../../../store";
import { defaultInlineMenu, defaultMenu } from "../../config";
import { createDefaultControls } from "../../controls";
import { defaultPuckRichTextOptions } from "../../extensions";

const getClassName = getClassNameFactory("MenuBar", styles);
const getMenuClassName = getClassNameFactory("MenuBarMenu", styles);

export const useMenu = ({
  inline,
  editor: _editor,
  field,
}: {
  inline?: boolean;
  editor: Editor | null;
  field?: RichtextField;
}) => {
  const { menu, inlineMenu, controls = {}, options } = field ?? {};

  const editor = useAppStore((s) => _editor ?? s.currentRichText?.editor);

  const loadedMenu = useMemo(() => {
    const _menu = inline ? inlineMenu : menu;
    const _defaultMenu = inline ? defaultInlineMenu : defaultMenu;

    return (
      Object.entries(_menu ?? {}).length > 0 ? _menu : _defaultMenu
    ) as RichTextMenuConfig;
  }, [menu, inlineMenu]);

  const defaultControls = useMemo(() => {
    return createDefaultControls({ ...defaultPuckRichTextOptions, ...options });
  }, [options]);

  const loadedControls = useMemo(() => {
    if (!editor) return { ...defaultControls, ...controls };

    return {
      ...defaultControls,
      ...controls,
    };
  }, [controls, editor]);

  const groupedMenu = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(loadedMenu).map(([groupName, keys]) => [
          groupName,
          Object.fromEntries(
            keys
              .map((key) => [
                key,
                loadedControls[key as keyof typeof loadedControls],
              ])
              .filter((entry): entry is [string, any] => Boolean(entry[1]))
          ),
        ])
      ) ?? {},
    [loadedControls, loadedMenu]
  );

  return groupedMenu;
};

export const MenuBar = ({
  editor,
  field,
  inline,
}: {
  field: RichtextField;
  editor: RichTextEditor | null;
  inline?: boolean;
}) => {
  const { tiptap = {} } = field;
  const { selector } = tiptap;

  const menuConfig = useMenu({
    field,
    editor,
    inline,
  });

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

  if (!editor || !editorState) {
    return null;
  }

  if (menuGroups.length === 0) {
    return null;
  }

  return (
    <>
      <div className={getClassName({ group: !inline })}>
        {menuGroups.map((key) => {
          const menuItems = menuConfig[key];
          if (!menuItems) return null; // handle undefined in Partial
          if (Object.keys(menuItems).length === 0) return null;
          return (
            <div key={String(key)} className={getMenuClassName({ inline })}>
              <RenderMenuItems
                menuItems={menuItems}
                editor={editor}
                editorState={editorState}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};
