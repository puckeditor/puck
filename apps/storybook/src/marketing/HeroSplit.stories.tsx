import type { Meta, StoryObj } from "@storybook/react";
import HeroSplit from "./HeroSplit";

const meta: Meta<typeof HeroSplit> = {
  title: "Marketing/Hero Split",
  component: HeroSplit,
  parameters: {
    layout: "fullscreen"
  },
  args: {
    eyebrow: "Modern launch kit",
    title: "Ship your next campaign in days, not weeks.",
    subtitle:
      "Reusable blocks, polished typography, and a design system that stays cohesive across every landing page.",
    badge: "New release",
    primaryLabel: "Start a project",
    secondaryLabel: "View components",
    imageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Modern workspace",
    accent: "#6366f1"
  }
};

export default meta;

type Story = StoryObj<typeof HeroSplit>;

export const Default: Story = {};

export const Amber: Story = {
  args: {
    accent: "#f97316",
    badge: "Design system",
    title: "Turn your marketing into a product.",
    subtitle: "Blend bold visuals with data-backed copy and launch with confidence."
  }
};
