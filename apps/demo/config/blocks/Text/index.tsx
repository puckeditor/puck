import React from "react";
import { ALargeSmall, AlignLeft } from "lucide-react";

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
  getOutlineItem: ({ label, props, Icon, Chevron, onClick, onMouseEnter, onMouseLeave }) => {
    const p = props as { align?: "left" | "center"; buttons?: { label?: string }[] };
    const btnCount = Array.isArray(p?.buttons) ? p.buttons.length : 0;

    return (
      <div className="flex items-center gap-2">
        <div
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="flex flex-1 items-center justify-between rounded-sm px-1 py-1 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {Icon}
            <span className="font-medium">{label}</span>
            <span className="opacity-70 text-xs">• align: {p?.align ?? "left"}</span>
            <span className="opacity-70 text-xs">• buttons: {btnCount}</span>
          </div>
          {Chevron}
        </div>
      </div>
    );
  },
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      labelIcon: <ALargeSmall size={16} />,
      options: [
        { label: "S", value: "s" },
        { label: "M", value: "m" },
      ],
    },
    align: {
      type: "radio",
      labelIcon: <AlignLeft size={16} />,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      type: "radio",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
      ],
    },
    maxWidth: { type: "text" },
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
