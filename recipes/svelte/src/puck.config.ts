import type { SvelteConfig, Data } from "@puckeditor/svelte";
import HeadingBlock from "./components/HeadingBlock.svelte";
import TextBlock from "./components/TextBlock.svelte";
import Flex from "./components/Flex.svelte";

export const config: SvelteConfig = {
  components: {
    HeadingBlock: {
      fields: { title: { type: "text" } },
      defaultProps: { title: "Heading" },
      render: HeadingBlock,
    },
    TextBlock: {
      fields: { text: { type: "textarea" } },
      defaultProps: { text: "Text" },
      render: TextBlock,
    },
    Flex: {
      fields: { items: { type: "slot" } },
      render: Flex,
    },
  },
};

export const initialData: Partial<Data> = { root: {}, content: [] };
