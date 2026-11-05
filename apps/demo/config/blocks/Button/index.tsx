import React from "react";
import { ComponentConfig } from "@/core/types";
import { Button as _Button } from "../../components/Button";
import { FieldTabs } from "../../components/FieldTabs";

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
      label: "Label",
      placeholder: "Lorem ipsum...",
      contentEditable: true,
    },
    href: {
      type: "text",
      label: "URL",
    },
    variant: {
      type: "radio",
      label: "Variant",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      content={[fields.label, fields.href]}
      appearance={[fields.variant]}
    />
  ),
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
