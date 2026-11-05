import React from "react";
import { ALargeSmall, AlignLeft } from "lucide-react";

import { ComponentConfig } from "@/core/types";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";
import { FieldTabs } from "../../components/FieldTabs";

export type TextProps = WithLayout<{
  align: "left" | "center" | "right";
  text?: string;
  padding?: string;
  size?: "s" | "m";
  color: "default" | "muted";
  maxWidth?: string;
}>;

const TextInner: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "textarea",
      label: "Text",
      contentEditable: true,
    },
    size: {
      type: "select",
      label: "Size",
      labelIcon: <ALargeSmall size={16} />,
      options: [
        { label: "S", value: "s" },
        { label: "M", value: "m" },
      ],
    },
    align: {
      type: "radio",
      label: "Align",
      labelIcon: <AlignLeft size={16} />,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      type: "radio",
      label: "Color",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
      ],
    },
    maxWidth: {
      type: "text",
      label: "Max width",
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      content={[fields.text]}
      appearance={[
        fields.size,
        fields.align,
        fields.color,
        fields.maxWidth,
        fields.layout,
      ]}
    />
  ),
  defaultProps: {
    align: "left",
    text: "Text",
    size: "m",
    color: "default",
  },
  render: ({ align, color, text, size, maxWidth }) => {
    return (
      <Section maxWidth={maxWidth}>
        <span
          style={{
            color:
              color === "default" ? "inherit" : "var(--site-color-text-muted)",
            display: "flex",
            textAlign: align,
            width: "100%",
            fontSize: size === "m" ? "20px" : "16px",
            maxWidth,
            justifyContent:
              align === "center"
                ? "center"
                : align === "right"
                ? "flex-end"
                : "flex-start",
          }}
        >
          {text}
        </span>
      </Section>
    );
  },
};

export const Text = withLayout(TextInner);
