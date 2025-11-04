import { memo, useCallback, useMemo, KeyboardEvent } from "react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultExtensions } from "./extensions";
import { MenuBar } from "./components/MenuBar";
import { EditorContent, Extensions } from "@tiptap/react";
import { defaultInlineMenu, defaultMenu } from "./config";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { EditorProps, RichTextMenuItem, RichTextSelectOptions } from "./types";
import { defaultControls } from "./controls";
import { BlockStyleSelect } from "./components/BlockStyleSelect";
import { DynamicActions } from "./components/InlineMenu";
import { useActiveEditor } from "./context";

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
    const { activeEditor, setActiveEditor } = useActiveEditor();
    const editor = useSyncedEditor<typeof loadedExtensions>({
      content,
      onChange,
      extensions: loadedExtensions,
      editable: !readOnly,
      onFocusChange: setActiveEditor,
    });

    const loadedMenu = useMemo(
      () =>
        Object.entries(menu).length > 0
          ? menu
          : inline
          ? defaultInlineMenu
          : defaultMenu,
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

    const handleHotkeyCapture = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "i"
        ) {
          event.stopPropagation();
        }
      },
      []
    );

    if (!editor) return null;

    const Menu = inline ? DynamicActions : MenuBar;

    return (
      <div onKeyDownCapture={handleHotkeyCapture}>
        {!readOnly && (
          <Menu
            menuConfig={groupedMenu || {}}
            editor={activeEditor}
            selector={selector}
          />
        )}
        <EditorContent
          editor={editor}
          className={getClassName({ editor: !inline, inline })}
        />
      </div>
    );
  }
);

Editor.displayName = "Editor";
