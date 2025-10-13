import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Underline,
  Minus,
  Quote,
  SquareCode,
  Strikethrough,
} from "lucide-react";
import { IconButton } from "../IconButton";
import { Editor } from "@tiptap/react";
import { EditorState } from "./types";

export const defaultControls = {
  AlignLeft: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().setTextAlign("left").run();
        }}
        disabled={!editorState.canAlignLeft}
        variant={editorState.isAlignLeft ? "secondary" : "primary"}
        title="Align left"
      >
        <AlignLeft size={20} />
      </IconButton>
    ),
  },

  AlignCenter: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().setTextAlign("center").run();
        }}
        disabled={!editorState.canAlignCenter}
        variant={editorState.isAlignCenter ? "secondary" : "primary"}
        title="Align center"
      >
        <AlignCenter size={20} />
      </IconButton>
    ),
  },

  AlignRight: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().setTextAlign("right").run();
        }}
        disabled={!editorState.canAlignRight}
        variant={editorState.isAlignRight ? "secondary" : "primary"}
        title="Align right"
      >
        <AlignRight size={20} />
      </IconButton>
    ),
  },

  AlignJustify: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().setTextAlign("justify").run();
        }}
        disabled={!editorState.canAlignJustify}
        variant={editorState.isAlignJustify ? "secondary" : "primary"}
        title="Justify"
      >
        <AlignJustify size={20} />
      </IconButton>
    ),
  },
  Bold: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleBold().run();
        }}
        disabled={!editorState.canBold}
        variant={editorState.isBold ? "secondary" : "primary"}
        title="Bold"
      >
        <Bold size={20} />
      </IconButton>
    ),
  },

  Italic: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleItalic().run();
        }}
        disabled={!editorState.canItalic}
        variant={editorState.isItalic ? "secondary" : "primary"}
        title="Italic"
      >
        <Italic size={20} />
      </IconButton>
    ),
  },

  Underline: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleUnderline().run();
        }}
        disabled={!editorState.canUnderline}
        variant={editorState.isUnderline ? "secondary" : "primary"}
        title="Underline"
      >
        <Underline size={20} />
      </IconButton>
    ),
  },

  Strikethrough: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleStrike().run();
        }}
        disabled={!editorState.canStrike}
        variant={editorState.isStrike ? "secondary" : "primary"}
        title="Strikethrough"
      >
        <Strikethrough size={20} />
      </IconButton>
    ),
  },

  InlineCode: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleCode().run();
        }}
        disabled={!editorState.canInlineCode}
        variant={editorState.isInlineCode ? "secondary" : "primary"}
        title="Inline code"
      >
        <Code size={20} />
      </IconButton>
    ),
  },

  BulletList: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleBulletList().run();
        }}
        disabled={!editorState.canBulletList}
        variant={editorState.isBulletList ? "secondary" : "primary"}
        title="Bullet list"
      >
        <List size={20} />
      </IconButton>
    ),
  },

  OrderedList: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleOrderedList().run();
        }}
        disabled={!editorState.canOrderedList}
        variant={editorState.isOrderedList ? "secondary" : "primary"}
        title="Ordered list"
      >
        <ListOrdered size={20} />
      </IconButton>
    ),
  },

  CodeBlock: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleCodeBlock().run();
        }}
        disabled={!editorState.canCodeBlock}
        variant={editorState.isCodeBlock ? "secondary" : "primary"}
        title="Code block"
      >
        <SquareCode size={20} />
      </IconButton>
    ),
  },

  Blockquote: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().toggleBlockquote().run();
        }}
        disabled={!editorState.canBlockquote}
        variant={editorState.isBlockquote ? "secondary" : "primary"}
        title="Blockquote"
      >
        <Quote size={20} />
      </IconButton>
    ),
  },

  HorizontalRule: {
    render: (editor: Editor, editorState: EditorState) => (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          editor.chain().focus().setHorizontalRule().run();
        }}
        disabled={!editorState.canHorizontalRule}
        variant="primary"
        title="Horizontal rule"
      >
        <Minus size={20} />
      </IconButton>
    ),
  },
};
