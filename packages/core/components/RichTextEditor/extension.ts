import { Extension } from "@tiptap/core";
import type { BlockquoteOptions } from "@tiptap/extension-blockquote";
import { Blockquote } from "@tiptap/extension-blockquote";
import type { BoldOptions } from "@tiptap/extension-bold";
import { Bold } from "@tiptap/extension-bold";
import type { CodeOptions } from "@tiptap/extension-code";
import { Code } from "@tiptap/extension-code";
import type { CodeBlockOptions } from "@tiptap/extension-code-block";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Document } from "@tiptap/extension-document";
import type { HardBreakOptions } from "@tiptap/extension-hard-break";
import { HardBreak } from "@tiptap/extension-hard-break";
import type { HeadingOptions } from "@tiptap/extension-heading";
import { Heading } from "@tiptap/extension-heading";
import type { HorizontalRuleOptions } from "@tiptap/extension-horizontal-rule";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import type { ItalicOptions } from "@tiptap/extension-italic";
import { Italic } from "@tiptap/extension-italic";
import type { LinkOptions } from "@tiptap/extension-link";
import { Link } from "@tiptap/extension-link";
import type {
  BulletListOptions,
  ListItemOptions,
  ListKeymapOptions,
  OrderedListOptions,
} from "@tiptap/extension-list";
import {
  BulletList,
  ListItem,
  ListKeymap,
  OrderedList,
} from "@tiptap/extension-list";
import type { ParagraphOptions } from "@tiptap/extension-paragraph";
import { Paragraph } from "@tiptap/extension-paragraph";
import type { StrikeOptions } from "@tiptap/extension-strike";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import TextAlign, { TextAlignOptions } from "@tiptap/extension-text-align";
import type { UnderlineOptions } from "@tiptap/extension-underline";
import { Underline } from "@tiptap/extension-underline";

export interface PuckRichTextOptions {
  /**
   * If set to false, the blockquote extension will not be registered
   * @example blockquote: false
   */
  blockquote: Partial<BlockquoteOptions> | false;

  /**
   * If set to false, the bold extension will not be registered
   * @example bold: false
   */
  bold: Partial<BoldOptions> | false;

  /**
   * If set to false, the bulletList extension will not be registered
   * @example bulletList: false
   */
  bulletList: Partial<BulletListOptions> | false;

  /**
   * If set to false, the code extension will not be registered
   * @example code: false
   */
  code: Partial<CodeOptions> | false;

  /**
   * If set to false, the codeBlock extension will not be registered
   * @example codeBlock: false
   */
  codeBlock: Partial<CodeBlockOptions> | false;

  /**
   * If set to false, the document extension will not be registered
   * @example document: false
   */
  document: false;

  /**
   * If set to false, the hardBreak extension will not be registered
   * @example hardBreak: false
   */
  hardBreak: Partial<HardBreakOptions> | false;

  /**
   * If set to false, the heading extension will not be registered
   * @example heading: false
   */
  heading: Partial<HeadingOptions> | false;

  /**
   * If set to false, the horizontalRule extension will not be registered
   * @example horizontalRule: false
   */
  horizontalRule: Partial<HorizontalRuleOptions> | false;

  /**
   * If set to false, the italic extension will not be registered
   * @example italic: false
   */
  italic: Partial<ItalicOptions> | false;

  /**
   * If set to false, the listItem extension will not be registered
   * @example listItem: false
   */
  listItem: Partial<ListItemOptions> | false;

  /**
   * If set to false, the listItemKeymap extension will not be registered
   * @example listKeymap: false
   */
  listKeymap: Partial<ListKeymapOptions> | false;

  /**
   * If set to false, the link extension will not be registered
   * @example link: false
   */
  link: Partial<LinkOptions> | false;

  /**
   * If set to false, the orderedList extension will not be registered
   * @example orderedList: false
   */
  orderedList: Partial<OrderedListOptions> | false;

  /**
   * If set to false, the paragraph extension will not be registered
   * @example paragraph: false
   */
  paragraph: Partial<ParagraphOptions> | false;

  /**
   * If set to false, the strike extension will not be registered
   * @example strike: false
   */
  strike: Partial<StrikeOptions> | false;

  /**
   * If set to false, the text extension will not be registered
   * @example text: false
   */
  text: false;

  /**
   * If set to false, the textAlign extension will not be registered
   * @example text: false
   */
  textAlign: Partial<TextAlignOptions> | false;

  /**
   * If set to false, the underline extension will not be registered
   * @example underline: false
   */
  underline: Partial<UnderlineOptions> | false;
}

export const defaultPuckRichTextOptions: Partial<PuckRichTextOptions> = {
  textAlign: {
    types: ["heading", "paragraph"],
  },
};

export const PuckRichText = Extension.create<PuckRichTextOptions>({
  name: "puckRichText",
  addExtensions() {
    const extensions = [];

    const options: Partial<PuckRichTextOptions> = {
      ...this.options,
      ...defaultPuckRichTextOptions,
    };

    if (options.bold !== false) {
      extensions.push(Bold.configure(options.bold));
    }

    if (options.blockquote !== false) {
      extensions.push(Blockquote.configure(options.blockquote));
    }

    if (options.bulletList !== false) {
      extensions.push(BulletList.configure(options.bulletList));
    }

    if (options.code !== false) {
      extensions.push(Code.configure(options.code));
    }

    if (options.codeBlock !== false) {
      extensions.push(CodeBlock.configure(options.codeBlock));
    }

    if (options.document !== false) {
      extensions.push(Document.configure(options.document));
    }

    if (options.hardBreak !== false) {
      extensions.push(HardBreak.configure(options.hardBreak));
    }

    if (options.heading !== false) {
      extensions.push(Heading.configure(options.heading));
    }

    if (options.horizontalRule !== false) {
      extensions.push(HorizontalRule.configure(options.horizontalRule));
    }

    if (options.italic !== false) {
      extensions.push(Italic.configure(options.italic));
    }

    if (options.listItem !== false) {
      extensions.push(ListItem.configure(options.listItem));
    }

    if (options.listKeymap !== false) {
      extensions.push(ListKeymap.configure(options?.listKeymap));
    }

    if (options.link !== false) {
      extensions.push(Link.configure(options?.link));
    }

    if (options.orderedList !== false) {
      extensions.push(OrderedList.configure(options.orderedList));
    }

    if (options.paragraph !== false) {
      extensions.push(Paragraph.configure(options.paragraph));
    }

    if (options.strike !== false) {
      extensions.push(Strike.configure(options.strike));
    }

    if (options.text !== false) {
      extensions.push(Text.configure(options.text));
    }

    if (options.textAlign !== false) {
      extensions.push(TextAlign.configure(options.textAlign));
    }

    if (options.underline !== false) {
      extensions.push(Underline.configure(options?.underline));
    }

    return extensions;
  },
});
