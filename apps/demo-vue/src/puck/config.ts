import type { VueConfig } from "@puckeditor/vue";
import Heading from "./components/Heading.vue";
import Card from "./components/Card.vue";
import Columns from "./components/Columns.vue";
import CounterBadge from "./components/CounterBadge.vue";
import FancyBox from "./components/FancyBox.vue";
import ColorField from "./fields/ColorField.vue";

export const config: VueConfig = {
  categories: {
    layout: { title: "Layout", components: ["Columns"] },
    content: { title: "Content", components: ["Heading", "Card", "FancyBox"] },
    data: { title: "Data", components: ["CounterBadge"] },
  },
  components: {
    Heading: {
      label: "Heading",
      fields: { title: { type: "text", contentEditable: true } },
      defaultProps: { title: "Heading" },
      render: Heading,
    },
    Card: {
      label: "Card (local state)",
      fields: {
        title: { type: "text" },
        description: { type: "textarea" },
      },
      defaultProps: { title: "Card title", description: "Some description" },
      render: Card,
    },
    Columns: {
      label: "Columns (slot)",
      fields: {
        columns: {
          type: "number",
          min: 1,
          max: 4,
        },
        items: { type: "slot" },
      },
      defaultProps: { columns: 2 },
      render: Columns,
    },
    CounterBadge: {
      label: "Counter (Pinia)",
      fields: {},
      render: CounterBadge,
    },
    FancyBox: {
      label: "Fancy box (scoped + custom field)",
      fields: {
        text: { type: "text" },
        color: { type: "custom", label: "Colour", render: ColorField },
      },
      defaultProps: { text: "Fancy!", color: "#7c3aed" },
      render: FancyBox,
    },
  },
};
