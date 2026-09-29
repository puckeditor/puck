import React from "react";
import { ComponentConfig, Slot } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";

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
  ai: {
    instructions:
      "Lays out children in a flexible row or column. Containers can be nested for more complex layouts.",
  },
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
      label: "Justify Content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
      ai: {
        instructions:
          "Controls how the flex container distributes space along the main axis (horizontal for row, vertical for column).",
      },
    },
    alignItems: {
      label: "Align Items",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
      ai: {
        instructions:
          "Controls how the flex container aligns items along the cross axis (vertical for row, horizontal for column).",
      },
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
      ai: {
        instructions: "The gap between children, in pixels.",
      },
    },
    wrap: {
      label: "Wrap",
      type: "radio",
      ai: {
        instructions:
          "Use 'wrap' to move children onto new lines when needed, or 'nowrap' to keep them on one line.",
      },
      options: [
        { label: "true", value: "wrap" },
        { label: "false", value: "nowrap" },
      ],
    },
    items: {
      type: "slot",
      disallow: ["Hero", "Stats", "Logos", "FeatureGrid"],
    },
  },
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
