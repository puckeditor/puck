import React from "react";
import { ComponentConfig } from "@/core/types";
import { Button as _Button } from "@/core/components/Button";
import { Link2, MousePointerClick } from "lucide-react";

export type ButtonProps = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
  size: "medium" | "large";
  newTab?: boolean;
};

export const Button: ComponentConfig<ButtonProps> = {
  label: "Button",
  fields: {
    label: {
      label: "Button Text",
      type: "text",
      placeholder: "Enter button text...",
      contentEditable: true,
    },
    href: {
      label: "Link URL",
      type: "text",
      placeholder: "https://example.com",
    },
    variant: {
      label: "Variant",
      type: "radio",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
    size: {
      label: "Size",
      type: "select",
      options: [
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
    },
    newTab: {
      label: "Open in",
      labelIcon: <MousePointerClick size={16} />,
      type: "radio",
      options: [
        { label: "Same tab", value: false },
        { label: "New tab", value: true },
      ],
    },
  },
  defaultProps: {
    label: "Button",
    href: "#",
    variant: "primary",
    size: "large",
    newTab: false,
  },
  render: ({ href, variant, label, puck, size, newTab }) => {
    return (
      <div>
        <_Button
          href={puck.isEditing ? "#" : href}
          variant={variant}
          size={size}
          tabIndex={puck.isEditing ? -1 : undefined}
          newTab={puck.isEditing ? false : newTab}
        >
          {label}
        </_Button>
      </div>
    );
  },
};
