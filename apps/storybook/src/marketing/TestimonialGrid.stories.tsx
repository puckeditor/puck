import type { Meta, StoryObj } from "@storybook/react";
import TestimonialGrid from "./TestimonialGrid";

const meta: Meta<typeof TestimonialGrid> = {
  title: "Marketing/Testimonial Grid",
  component: TestimonialGrid,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof TestimonialGrid>;

export const Default: Story = {};

export const WithPhotos: Story = {
  args: {
    testimonials: [
      {
        quote:
          "We replaced three separate landing templates with a single modular system and cut launch time in half.",
        name: "Ava Thompson",
        role: "Head of Growth",
        company: "Northwind",
        avatarUrl:
          "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80"
      },
      {
        quote:
          "The design tokens mean our marketing team can build pages without losing brand consistency.",
        name: "Maya Chen",
        role: "Brand Designer",
        company: "Lumen",
        avatarUrl:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
      }
    ],
    accent: "#ec4899"
  }
};
