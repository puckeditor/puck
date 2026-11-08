import React from "react";
import { ComponentConfig } from "@/core/types";
import { WithLayout, withLayout } from "../../components/Layout";
import { Section } from "../../components/Section";
import { FieldTabs } from "../../components/FieldTabs";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("RichText", styles);

export type RichTextProps = WithLayout<{
  richtext?: string;
}>;

const RichTextInner: ComponentConfig<RichTextProps> = {
  // This is just RTE demo, so no need to use it by itself.
  ai: { exclude: true },
  fields: {
    richtext: {
      type: "richtext",
      label: "Rich text",
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs content={[fields.richtext]} appearance={[fields.layout]} />
  ),
  render: ({ richtext }) => {
    return <Section className={getClassName()}>{richtext}</Section>;
  },
  defaultProps: {
    richtext: "<h2>Heading</h2><p>Body</p>",
  },
};

export const RichText = withLayout(RichTextInner);
