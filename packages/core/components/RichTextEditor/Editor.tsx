import { memo, useMemo } from "react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultExtensions } from "./extensions";
import { MenuBar } from "./components/MenuBar/MenuBar";
import { EditorContent, Extensions } from "@tiptap/react";
import { defaultInlineMenu, defaultMenu } from "./config";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { EditorProps, RichTextMenuItem, RichTextSelectOptions } from "./types";
import { defaultControls } from "./controls";
import { BlockStyleSelect } from "./components/BlockStyleSelect/BlockStyleSelect";
import { InlineMenu } from "./components/InlineMenu/InlineMenu";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export const Editor = memo(
  ({
    onChange,
    content,
    readOnly = false,
    menu = {},
    textSelectOptions = [],
    controls = {},
    extensions = [],
    selector,
    inline = false,
  }: EditorProps) => {
    const loadedExtensions = useMemo(
      () => [...defaultExtensions, ...extensions] as Extensions,
      [extensions]
    );
    const editor = useSyncedEditor<typeof loadedExtensions>({
      content,
      onChange,
      extensions: loadedExtensions,
      editable: !readOnly,
    });

    const loadedMenu = useMemo(
      () => (menu ? menu : inline ? defaultInlineMenu : defaultMenu),
      [menu]
    );

    const loadedTextSelection = useMemo(
      () =>
        textSelectOptions.length > 0
          ? textSelectOptions
          : (["p", "h2", "h3", "h4", "h5", "h6"] as RichTextSelectOptions[]),
      [textSelectOptions]
    );

    const loadedControls = useMemo(() => {
      if (!editor) return { ...defaultControls, ...controls };

      return {
        ...defaultControls,
        ...controls,
        TextSelect: {
          render: () => (
            <BlockStyleSelect config={loadedTextSelection} editor={editor} />
          ),
        },
      };
    }, [controls, editor, loadedTextSelection]);

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
                .filter((entry): entry is [string, RichTextMenuItem] =>
                  Boolean(entry[1])
                )
            ),
          ])
        ),
      [loadedControls, loadedMenu]
    );

    if (!editor) return null;

    const Menu = inline ? InlineMenu : MenuBar;

    return (
      <>
        {!readOnly && (
          <Menu
            menuConfig={groupedMenu || {}}
            editor={editor}
            selector={selector}
          />
        )}
        <EditorContent
          editor={editor}
          className={getClassName({ editor: !inline, inline })}
        />
      </>
    );
  }
);

Editor.displayName = "Editor";
