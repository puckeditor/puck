import React from "react";
import { ComponentConfig, Slot } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";
import { FieldTabs } from "../../components/FieldTabs";

const getClassName = getClassNameFactory("Flex", styles);

export type FlexProps = WithLayout<{
  justifyContent: "start" | "center" | "end";
  direction: "row" | "column";
  gap: number;
  wrap: "wrap" | "nowrap";
  items: Slot;
  alignItems: "start" | "center" | "end";
}>;

const FlexInternal: ComponentConfig<FlexProps> = {
  fields: {
    direction: {
      label: "Direction",
      type: "radio",
      options: [
        { label: "Row", value: "row" },
        { label: "Column", value: "column" },
      ],
    },
    justifyContent: {
      label: "Justify content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    alignItems: {
      label: "Align items",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
    },
    wrap: {
      label: "Wrap",
      type: "radio",
      options: [
        { label: "True", value: "wrap" },
        { label: "False", value: "nowrap" },
      ],
    },
    items: {
      type: "slot",
      disallow: [
        "Hero",
        "Stats",
        "Logos",
        "FeatureGrid",
        "CTA",
        "FAQ",
        "Steps",
        "FeatureSplit",
        "Bento",
      ],
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      appearance={[
        fields.direction,
        fields.justifyContent,
        fields.alignItems,
        fields.gap,
        fields.wrap,
        fields.layout,
      ]}
    />
  ),
  defaultProps: {
    justifyContent: "start",
    alignItems: "start",
    direction: "row",
    gap: 24,
    wrap: "wrap",
    layout: {
      grow: true,
    },
    items: [],
  },
  render: ({
    justifyContent,
    direction,
    gap,
    wrap,
    alignItems,
    items: Items,
  }) => {
    return (
      <Section style={{ height: "100%" }}>
        <Items
          className={getClassName()}
          style={{
            justifyContent,
            flexDirection: direction,
            gap,
            flexWrap: wrap,
            alignItems,
          }}
        />
      </Section>
    );
  },
};

export const Flex = withLayout(FlexInternal);
