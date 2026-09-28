import React from "react";
import { ComponentConfig } from "@/core/types";
import { Button as _Button } from "@/core/components/Button";

export type ButtonProps = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export const Button: ComponentConfig<ButtonProps> = {
  label: "Button",
  fields: {
    label: {
      type: "text",
      placeholder: "Lorem ipsum...",
      contentEditable: true,
    },
    href: {
      type: "text",
      ai: {
        instructions:
          "Use a URL supplied by the user or verified in the business context. Otherwise, use '#'.",
      },
    },
    variant: {
      type: "radio",
      ai: {
        instructions:
          "Use 'primary' for the main action in a group and 'secondary' for supporting actions.",
      },
      options: [
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ],
    },
  },
  defaultProps: {
    label: "Button",
    href: "#",
    variant: "primary",
  },
  render: ({ href, variant, label, puck }) => {
    return (
      <div>
        <_Button
          href={puck.isEditing ? "#" : href}
          variant={variant}
          size="large"
          tabIndex={puck.isEditing ? -1 : undefined}
        >
          {label}
        </_Button>
      </div>
    );
  },
};
