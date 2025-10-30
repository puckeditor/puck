import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

export const defaultExtensions = [
  StarterKit,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    defaultAlignment: "left",
  }),
];
