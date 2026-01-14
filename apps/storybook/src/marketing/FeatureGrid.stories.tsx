import type { Meta, StoryObj } from "@storybook/react";
import FeatureGrid from "./FeatureGrid";

const meta: Meta<typeof FeatureGrid> = {
  title: "Marketing/Feature Grid",
  component: FeatureGrid,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof FeatureGrid>;

export const Default: Story = {};

export const Minimal: Story = {
  args: {
    title: "A leaner setup",
    subtitle: "Curate only the blocks you need for your next campaign.",
    features: [
      {
        title: "Guided templates",
        description: "Start with tested layouts and personalize the rest.",
        icon: "A"
      },
      {
        title: "Smart exports",
        description: "Publish as static HTML, React, or embed anywhere.",
        icon: "B"
      }
    ],
    accent: "#0ea5e9"
  }
};
