import React from "react";
import { ALargeSmall, TextAlignStart } from "lucide-react";

import { ComponentConfig } from "@/core/types";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";

export type TextProps = WithLayout<{
  align: "left" | "center" | "right";
  text?: string;
  padding?: string;
  size?: "s" | "m";
  color: "default" | "muted";
  maxWidth?: string;
}>;

const TextInner: ComponentConfig<TextProps> = {
  label: "Text",
  fields: {
    text: {
      label: "Text",
      type: "textarea",
      contentEditable: true,
    },
    size: {
      label: "Font size",
      type: "select",
      labelIcon: <ALargeSmall size={16} />,
      options: [
        { label: "Small", value: "s" },
        { label: "Medium", value: "m" },
      ],
    },
    align: {
      label: "Alignment",
      type: "radio",
      labelIcon: <TextAlignStart size={16} />,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      label: "Color",
      type: "radio",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
      ],
    },
    maxWidth: {
      label: "Max width",
      type: "text",
      placeholder: "e.g. 800px, 90%",
    },
  },
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
              color === "default" ? "inherit" : "var(--puck-color-grey-05)",
            display: "flex",
            textAlign: align,
            width: "100%",
            fontSize: size === "m" ? "20px" : "16px",
            fontWeight: 300,
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
