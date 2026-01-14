import type { Meta, StoryObj } from "@storybook/react";
import StatsBand from "./StatsBand";

const meta: Meta<typeof StatsBand> = {
  title: "Marketing/Stats Band",
  component: StatsBand,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof StatsBand>;

export const Default: Story = {};

export const Teal: Story = {
  args: {
    accent: "#14b8a6",
    stats: [
      { value: "1.8M", label: "Monthly visits" },
      { value: "41%", label: "Conversion lift" },
      { value: "120+", label: "Templates" }
    ]
  }
};
