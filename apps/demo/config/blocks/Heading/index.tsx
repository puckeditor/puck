import React from "react";

import { ComponentConfig } from "@/core/types";
import { Heading as _Heading } from "@/core/components/Heading";
import type { HeadingProps as _HeadingProps } from "@/core/components/Heading";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";
import { TextAlignStart } from "lucide-react";

export type HeadingProps = WithLayout<{
  align: "left" | "center" | "right";
  text?: string;
  level?: _HeadingProps["rank"];
  size: _HeadingProps["size"];
}>;

const sizeOptions = [
  { label: "XXXL", value: "xxxl" },
  { label: "XXL", value: "xxl" },
  { label: "XL", value: "xl" },
  { label: "L", value: "l" },
  { label: "M", value: "m" },
  { label: "S", value: "s" },
  { label: "XS", value: "xs" },
];

const levelOptions = [
  { label: "-", value: "" },
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
  { label: "H4", value: "4" },
  { label: "H5", value: "5" },
  { label: "H6", value: "6" },
];

const HeadingInternal: ComponentConfig<HeadingProps> = {
  label: "Heading",
  fields: {
    text: {
      label: "Text",
      type: "textarea",
      contentEditable: true,
    },
    size: {
      label: "Size",
      type: "select",
      options: sizeOptions,
    },
    level: {
      label: "Heading level",
      type: "radio",
      options: levelOptions,
    },
    align: {
      label: "Alignment",
      labelIcon: <TextAlignStart size={16} />,
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    level: "1",
    layout: {
      padding: "8px",
    },
  },
  render: ({ align, text, size, level }) => {
    return (
      <Section>
        <_Heading size={size} rank={level as any}>
          <span style={{ display: "block", textAlign: align, width: "100%" }}>
            {text}
          </span>
        </_Heading>
      </Section>
    );
  },
};

export const Heading = withLayout(HeadingInternal);
