import type { Meta, StoryObj } from "@storybook/react";
import PricingTable from "./PricingTable";

const meta: Meta<typeof PricingTable> = {
  title: "Marketing/Pricing Table",
  component: PricingTable,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof PricingTable>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    plans: [
      {
        name: "Core",
        price: "$39",
        period: "/month",
        description: "All essentials for lean teams.",
        features: ["Unlimited pages", "Brand kit", "Email support"],
        ctaLabel: "Choose Core",
        highlighted: true
      },
      {
        name: "Scale",
        price: "$149",
        period: "/month",
        description: "For teams managing multiple sites.",
        features: ["Multi-brand", "Roles & permissions", "Slack support"],
        ctaLabel: "Choose Scale"
      }
    ],
    accent: "#a855f7"
  }
};
