import { useEditorState } from "@tiptap/react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { ReactNode, useMemo } from "react";
import {
  EditorState,
  RichTextEditor,
  RichTextSelector,
} from "../RichTextEditor/types";
import { defaultEditorState } from "../RichTextEditor/selector";
import { RichtextField } from "../../types";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignSelect,
  Blockquote,
  Bold,
  BulletList,
  CodeBlock,
  HeadingSelect,
  HorizontalRule,
  InlineCode,
  Italic,
  ListSelect,
  OrderedList,
  Strikethrough,
  Underline,
} from "./controls";
import { ControlContext, useControlContext } from "./lib/use-control-context";
import { Control } from "./components/Control";

const getClassName = getClassNameFactory("RichTextMenu", styles);

const DefaultMenu = ({ children }: { children: ReactNode }) => {
  return <RichTextMenu>{children}</RichTextMenu>;
};

export const RichTextMenu = ({ children }: { children: ReactNode }) => {
  const { inline } = useControlContext();
  return (
    <div className={getClassName({ inline, form: !inline })} data-puck-rte-menu>
      {children}
    </div>
  );
};

const Group = ({ children }: { children: ReactNode }) => {
  return <div className={getClassName("group")}>{children}</div>;
};

RichTextMenu.Group = Group;
RichTextMenu.Control = Control;
RichTextMenu.AlignCenter = AlignCenter;
RichTextMenu.AlignJustify = AlignJustify;
RichTextMenu.AlignLeft = AlignLeft;
RichTextMenu.AlignRight = AlignRight;
RichTextMenu.AlignSelect = AlignSelect;
RichTextMenu.Blockquote = Blockquote;
RichTextMenu.Bold = Bold;
RichTextMenu.BulletList = BulletList;
RichTextMenu.CodeBlock = CodeBlock;
RichTextMenu.HeadingSelect = HeadingSelect;
RichTextMenu.HorizontalRule = HorizontalRule;
RichTextMenu.InlineCode = InlineCode;
RichTextMenu.Italic = Italic;
RichTextMenu.ListSelect = ListSelect;
RichTextMenu.OrderedList = OrderedList;
RichTextMenu.Strikethrough = Strikethrough;
RichTextMenu.Underline = Underline;

export const LoadedRichTextMenu = ({
  editor,
  field,
  readOnly,
  inline,
}: {
  field: RichtextField;
  editor: RichTextEditor | null;
  readOnly: boolean;
  inline?: boolean;
}) => {
  const { tiptap = {}, renderMenu, renderInlineMenu } = field;
  const { selector } = tiptap;

  const resolvedSelector = useMemo(() => {
    return (ctx: Parameters<RichTextSelector>[0]) =>
      ({
        ...defaultEditorState(ctx, readOnly),
        ...(selector ? selector(ctx, readOnly) : {}),
      } as RichTextSelector);
  }, [selector, readOnly]);

  const editorState = useEditorState<EditorState>({
    editor,
    selector: resolvedSelector,
  });

  const InlineMenu = useMemo(
    () => renderInlineMenu || DefaultMenu,
    [renderInlineMenu]
  );

  const Menu = useMemo(() => renderMenu || DefaultMenu, [renderMenu]);

  if (!editor || !editorState) {
    return null;
  }

  return (
    <ControlContext.Provider
      value={{ editor, editorState, inline, options: field.options, readOnly }}
    >
      {inline ? (
        <InlineMenu
          editor={editor}
          editorState={editorState}
          readOnly={readOnly}
        >
          <Group>
            <Bold />
            <Italic />
            <Underline />
          </Group>
        </InlineMenu>
      ) : (
        <Menu editor={editor} editorState={editorState} readOnly={readOnly}>
          <Group>
            <HeadingSelect />
            <ListSelect />
          </Group>
          <Group>
            <Bold />
            <Italic />
            <Underline />
          </Group>
          <Group>
            <AlignSelect />
          </Group>
        </Menu>
      )}
    </ControlContext.Provider>
  );
};
