import React from "react";

import { ComponentConfig } from "@/core/types";
import { Section } from "../../components/Section";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";
import { WithLayout, withLayout } from "../../components/Layout";
import { HeadingFields } from "./HeadingFields";

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
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: sizeOptions,
    },
    level: {
      type: "select",
      options: levelOptions,
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  renderFields: ({ fields }) => <HeadingFields fields={fields} />,
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
