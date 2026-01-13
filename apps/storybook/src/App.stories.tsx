import type { Meta, StoryObj } from "@storybook/react";
import App from "./App";

const meta: Meta<typeof App> = {
  title: "App",
  component: App,
  args: {
    eyebrow: "Hello Storybook",
    title: "Vite + Storybook",
    description:
      "This is a fresh Vite app. Open Storybook to explore components in isolation.",
    primaryLabel: "Vite Docs",
    secondaryLabel: "Storybook Docs",
    puckLabel: "Open Puck",
    primaryHref: "https://vite.dev",
    secondaryHref: "https://storybook.js.org",
    puckHref: "/puck",
    accent: "#f97316",
  },
  argTypes: {
    eyebrow: { control: "text" },
    title: { control: "text" },
    description: { control: "text" },
    primaryLabel: { control: "text" },
    secondaryLabel: { control: "text" },
    puckLabel: { control: "text" },
    primaryHref: { control: "text" },
    secondaryHref: { control: "text" },
    puckHref: { control: "text" },
    accent: { control: "color" },
  },
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};
