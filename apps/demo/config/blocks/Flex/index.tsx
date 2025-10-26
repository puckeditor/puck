import React from "react";
import { ComponentConfig, Slot } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";

const getClassName = getClassNameFactory("Flex", styles);

export type FlexProps = WithLayout<{
  justifyContent: "start" | "center" | "end" | "space-between" | "space-around";
  direction: "row" | "column";
  gap: number;
  wrap: "wrap" | "nowrap";
  items: Slot;
}>;

const FlexInternal: ComponentConfig<FlexProps> = {
  label: "Flex Container",
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
      type: "select",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
        { label: "Between", value: "space-between" },
        { label: "Around", value: "space-around" },
      ],
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
      max: 100,
      step: 4,
    },
    wrap: {
      label: "Wrap",
      type: "radio",
      options: [
        { label: "Yes", value: "wrap" },
        { label: "No", value: "nowrap" },
      ],
    },
    items: {
      label: "Content",
      type: "slot",
    },
  },
  defaultProps: {
    justifyContent: "start",
    direction: "row",
    gap: 24,
    wrap: "wrap",
    layout: {
      grow: true,
    },
    items: [],
  },
  render: ({ justifyContent, direction, gap, wrap, items: Items }) => {
    return (
      <Section style={{ height: "100%" }}>
        <Items
          className={getClassName()}
          style={{
            justifyContent,
            flexDirection: direction,
            gap,
            flexWrap: wrap,
          }}
          disallow={["Hero", "Stats"]}
        />
      </Section>
    );
  },
};

export const Flex = withLayout(FlexInternal);
