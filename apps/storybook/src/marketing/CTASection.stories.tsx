import type { Meta, StoryObj } from "@storybook/react";
import CTASection from "./CTASection";

const meta: Meta<typeof CTASection> = {
  title: "Marketing/CTA Section",
  component: CTASection,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof CTASection>;

export const Default: Story = {};

export const Inverted: Story = {
  args: {
    accent: "#f97316",
    title: "Move faster with a shared launch system",
    subtitle: "Book a walkthrough or start a free trial in minutes.",
    primaryLabel: "Book demo",
    secondaryLabel: "Start free"
  }
};
