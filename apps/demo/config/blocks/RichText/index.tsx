import React from "react";
import { ComponentConfig } from "@/core/types";
import { WithLayout, withLayout } from "../../components/Layout";
import { Section } from "../../components/Section";

export type RichTextProps = WithLayout<{
  richtext?: string;
}>;

const RichTextInner: ComponentConfig<RichTextProps> = {
  fields: {
    richtext: {
      type: "richtext",
    },
  },
  render: ({ richtext }) => {
    return <Section>{richtext}</Section>;
  },
  defaultProps: {
    richtext: "<h2>Heading</h2><p>Body</p>",
  },
};

export const RichText = withLayout(RichTextInner);
