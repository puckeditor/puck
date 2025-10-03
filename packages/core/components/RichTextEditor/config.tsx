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
import { RichTextConfigType } from "../../types";
import { RichTextEditor as Editor } from "./types";

export const defaultConfig: RichTextConfigType = {
  menu: {
    alignment: [
      {
        title: "AlignLeft",
        icon: <AlignLeft size={20} />,
        action: (e: Editor) => e.chain().setTextAlign("left").run(),
        state: (e: Editor) => e.isActive({ textAlign: "left" }),
      },
      {
        title: "AlignCenter",
        icon: <AlignCenter size={20} />,
        action: (e: Editor) => e.chain().setTextAlign("center").run(),
        state: (e: Editor) => e.isActive({ textAlign: "center" }),
      },
      {
        title: "AlignRight",
        icon: <AlignRight size={20} />,
        action: (e: Editor) => e.chain().setTextAlign("right").run(),
        state: (e: Editor) => e.isActive({ textAlign: "right" }),
      },
      {
        title: "Justify",
        icon: <AlignJustify size={20} />,
        action: (e: Editor) => e.chain().setTextAlign("justify").run(),
        state: (e: Editor) => e.isActive({ textAlign: "justify" }),
      },
    ],

    headings: [2, 3, 4, 5, 6],

    text: [
      {
        title: "Bold",
        icon: <Bold size={20} />,
        action: (e: Editor) => e.chain().toggleBold().run(),
        state: (e: Editor) => e.isActive("bold"),
        can: (e: Editor) => e.can().chain().toggleBold().run(),
      },
      {
        title: "Italic",
        icon: <Italic size={20} />,
        action: (e: Editor) => e.chain().toggleItalic().run(),
        state: (e: Editor) => e.isActive("italic"),
        can: (e: Editor) => e.can().chain().toggleItalic().run(),
      },
      {
        title: "Underline",
        icon: <Underline size={20} />,
        action: (e: Editor) => e.chain().toggleUnderline().run(),
        state: (e: Editor) => e.isActive("underline"),
        can: (e: Editor) => e.can().chain().toggleUnderline().run(),
      },
      {
        title: "Strikethrough",
        icon: <Strikethrough size={20} />,
        action: (e: Editor) => e.chain().toggleStrike().run(),
        state: (e: Editor) => e.isActive("strike"),
        can: (e: Editor) => e.can().chain().toggleStrike().run(),
      },
    ],

    blocks: [
      {
        title: "InlineCode",
        icon: <Code size={20} />,
        action: (e: Editor) => e.chain().toggleCode().run(),
        state: (e: Editor) => e.isActive("code"),
        can: (e: Editor) => e.can().chain().toggleCode().run(),
      },
      {
        title: "BulletList",
        icon: <List size={20} />,
        action: (e: Editor) => e.chain().toggleBulletList().run(),
        state: (e: Editor) => e.isActive("bulletList"),
      },
      {
        title: "OrderedList",
        icon: <ListOrdered size={20} />,
        action: (e: Editor) => e.chain().toggleOrderedList().run(),
        state: (e: Editor) => e.isActive("orderedList"),
      },
      {
        title: "CodeBlock",
        icon: <SquareCode size={20} />,
        action: (e: Editor) => e.chain().toggleCodeBlock().run(),
        state: (e: Editor) => e.isActive("codeBlock"),
      },
      {
        title: "Blockquote",
        icon: <Quote size={20} />,
        action: (e: Editor) => e.chain().toggleBlockquote().run(),
        state: (e: Editor) => e.isActive("blockquote"),
      },
    ],

    breaks: [
      {
        title: "HorizontalRule",
        icon: <Minus size={20} />,
        action: (e: Editor) => e.chain().setHorizontalRule().run(),
      },
    ],
  },
  inlineMenu: {},
};

defaultConfig.inlineMenu = {
  text: defaultConfig.menu.text,
};
