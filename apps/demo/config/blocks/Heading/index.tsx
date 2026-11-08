import React from "react";

import { ComponentConfig } from "@/core/types";
import { Section } from "../../components/Section";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";
import { WithLayout, withLayout } from "../../components/Layout";
import { FieldTabs } from "../../components/FieldTabs";

const getClassName = getClassNameFactory("Heading", styles);

export type HeadingProps = WithLayout<{
  align: "left" | "center" | "right";
  text?: string;
  level?: "1" | "2" | "3" | "4" | "5" | "6";
  size: "xxxl" | "xxl" | "xl" | "l" | "m" | "s" | "xs";
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
      "Displays a heading (h1-h6 element). Don't use this unless asked by the user explicitly.",
  },
  fields: {
    text: {
      type: "textarea",
      label: "Text",
      contentEditable: true,
    },
    size: {
      type: "select",
      label: "Size",
      options: sizeOptions,
    },
    level: {
      type: "select",
      label: "Level",
      options: levelOptions,
      ai: {
        required: true,
        instructions:
          "Choose an h1-h6 level that follows the page hierarchy. The empty value renders text without a heading tag.",
      },
    },
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      content={[fields.text, fields.level]}
      appearance={[fields.size, fields.align, fields.layout]}
    />
  ),
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    layout: {
      padding: "8px",
    },
  },
  render: ({ align, text, size, level }) => {
    const Tag = level ? (`h${level}` as const) : "span";

    return (
      <Section>
        <Tag
          className={getClassName({ [size]: true })}
          style={{ textAlign: align }}
        >
          {text}
        </Tag>
      </Section>
    );
  },
};

export const Heading = withLayout(HeadingInternal);
