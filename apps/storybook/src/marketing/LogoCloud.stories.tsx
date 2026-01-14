import type { Meta, StoryObj } from "@storybook/react";
import LogoCloud from "./LogoCloud";

const meta: Meta<typeof LogoCloud> = {
  title: "Marketing/Logo Cloud",
  component: LogoCloud,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof LogoCloud>;

export const Default: Story = {};

export const Expanded: Story = {
  args: {
    title: "Teams shipping every day",
    logos: [
      { name: "Northwind" },
      { name: "Lumen" },
      { name: "Arcadia" },
      { name: "Fable" },
      { name: "Keystone" },
      { name: "Cascade" },
      { name: "Signal" },
      { name: "Metric" }
    ],
    accent: "#14b8a6"
  }
};
