import { EditorStateSnapshot } from "@tiptap/react";

export const defaultEditorState = (ctx: EditorStateSnapshot) => {
  const editor = ctx.editor;
  if (!editor) return {};

  return {
    isAlignLeft: editor.isActive({ textAlign: "left" }),
    canAlignLeft: editor.can().chain().setTextAlign?.("left").run(),

    isAlignCenter: editor.isActive({ textAlign: "center" }),
    canAlignCenter: editor.can().chain().setTextAlign?.("center").run(),

    isAlignRight: editor.isActive({ textAlign: "right" }),
    canAlignRight: editor.can().chain().setTextAlign?.("right").run(),

    isAlignJustify: editor.isActive({ textAlign: "justify" }),
    canAlignJustify: editor.can().chain().setTextAlign?.("justify").run(),

    isBold: editor.isActive("bold"),
    canBold: editor.can().chain().toggleBold?.().run(),

    isItalic: editor.isActive("italic"),
    canItalic: editor.can().chain().toggleItalic?.().run(),

    isUnderline: editor.isActive("underline"),
    canUnderline: editor.can().chain().toggleUnderline?.().run(),

    isStrike: editor.isActive("strike"),
    canStrike: editor.can().chain().toggleStrike?.().run(),

    isInlineCode: editor.isActive("code"),
    canInlineCode: editor.can().chain().toggleCode?.().run(),

    isBulletList: editor.isActive("bulletList"),
    canBulletList: editor.can().chain().toggleBulletList?.().run(),

    isOrderedList: editor.isActive("orderedList"),
    canOrderedList: editor.can().chain().toggleOrderedList?.().run(),

    isCodeBlock: editor.isActive("codeBlock"),
    canCodeBlock: editor.can().chain().toggleCodeBlock?.().run(),

    isBlockquote: editor.isActive("blockquote"),
    canBlockquote: editor.can().chain().toggleBlockquote?.().run(),

    canHorizontalRule: editor.can().chain().setHorizontalRule?.().run(),
  };
};
