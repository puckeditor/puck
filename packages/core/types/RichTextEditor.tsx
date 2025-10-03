import { RichTextMenuConfig } from "../components/RichTextEditor/types";

// Root config type
export type RichTextConfigType = {
  menu: Partial<RichTextMenuConfig>;
  inlineMenu: Partial<RichTextMenuConfig>; // adjust once inline menu is defined
};
