import type { EditorStateSnapshot } from "@tiptap/react";

export const defaultEditorState = (
  ctx: EditorStateSnapshot,
  readOnly: boolean
) => {
  const editor = ctx.editor;
  if (!editor) return {};

  const canChain = () => editor.can().chain();

  return {
    isAlignLeft: editor.isActive({ textAlign: "left" }),
    canAlignLeft: !readOnly && canChain().setTextAlign?.("left").run(),

    isAlignCenter: editor.isActive({ textAlign: "center" }),
    canAlignCenter: !readOnly && canChain().setTextAlign?.("center").run(),

    isAlignRight: editor.isActive({ textAlign: "right" }),
    canAlignRight: !readOnly && canChain().setTextAlign?.("right").run(),

    isAlignJustify: editor.isActive({ textAlign: "justify" }),
    canAlignJustify: !readOnly && canChain().setTextAlign?.("justify").run(),

    isBold: editor.isActive("bold"),
    canBold: !readOnly && canChain().toggleBold?.().run(),

    isItalic: editor.isActive("italic"),
    canItalic: !readOnly && canChain().toggleItalic?.().run(),

    isUnderline: editor.isActive("underline"),
    canUnderline: !readOnly && canChain().toggleUnderline?.().run(),

    isStrike: editor.isActive("strike"),
    canStrike: !readOnly && canChain().toggleStrike?.().run(),

    isInlineCode: editor.isActive("code"),
    canInlineCode: !readOnly && canChain().toggleCode?.().run(),

    isBulletList: editor.isActive("bulletList"),
    canBulletList: !readOnly && canChain().toggleBulletList?.().run(),

    isOrderedList: editor.isActive("orderedList"),
    canOrderedList: !readOnly && canChain().toggleOrderedList?.().run(),

    isCodeBlock: editor.isActive("codeBlock"),
    canCodeBlock: !readOnly && canChain().toggleCodeBlock?.().run(),

    isBlockquote: editor.isActive("blockquote"),
    canBlockquote: !readOnly && canChain().toggleBlockquote?.().run(),

    canHorizontalRule: !readOnly && canChain().setHorizontalRule?.().run(),
  };
};
