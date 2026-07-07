import type { VueConfig } from "@puckeditor/vue";
import HeadingBlock from "./components/HeadingBlock.vue";
import TextBlock from "./components/TextBlock.vue";
import Flex from "./components/Flex.vue";

export const config: VueConfig = {
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

export type UserData = {
  root: { props?: { title?: string } };
  content: any[];
};

export const initialData: UserData = { root: {}, content: [] };
