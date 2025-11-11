import { RichTextMenuConfig } from "./types";

export const defaultMenu: RichTextMenuConfig = {
  align: ["AlignLeft", "AlignCenter", "AlignRight", "AlignJustify"],
  text: ["Bold", "Italic", "Underline", "Strikethrough"],
  headings: ["TextSelect"],
  lists: ["BulletList", "OrderedList"],
};

export const defaultInlineMenu: RichTextMenuConfig = {
  text: [
    "BoldAction",
    "ItalicAction",
    "UnderlineAction",
    "StrikethroughAction",
  ],
};
