import React from "react";

import { ComponentConfig } from "@/core/types";
import { Heading as _Heading } from "@/core/components/Heading";
import type { HeadingProps as _HeadingProps } from "@/core/components/Heading";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";

export type HeadingProps = WithLayout<{
  align: "left" | "center" | "right";
  text?: string;
  level?: _HeadingProps["rank"];
  size: _HeadingProps["size"];
}>;

const sizeOptions = [
  { value: "xxxl", label: "XXXL" },
  { value: "xxl", label: "XXL" },
  { value: "xl", label: "XL" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "s", label: "S" },
  { value: "xs", label: "XS" },
];

const levelOptions = [
  { label: "", value: "" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
];

const HeadingInternal: ComponentConfig<HeadingProps> = {
  ai: {
    instructions:
      "Displays a heading. A Hero already renders the page h1, so pages with a Hero start Heading components at h2. Add a Space after a Heading that is a direct child of the page's top-level `content` array.",
  },
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: sizeOptions,
      ai: {
        instructions:
          "Use 'xxl' for h1 and for h2 headings that are direct children of the page's top-level `content` array. Use 'xl' for other h2 headings.",
      },
    },
    level: {
      type: "select",
      options: levelOptions,
      ai: {
        required: true,
        instructions:
          "Choose an h1-h6 level that follows the page hierarchy. On pages without a Hero, use h1 for the main page heading. The empty value renders text without a heading tag.",
      },
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      ai: {
        instructions:
          "Center headings that are direct children of the page's top-level `content` array unless the user asks otherwise. For nested headings, choose an alignment that fits the layout.",
      },
    },
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
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
