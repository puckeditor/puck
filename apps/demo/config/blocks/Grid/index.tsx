import React from "react";
import { ComponentConfig, Slot } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";
import { withLayout } from "../../components/Layout";

const getClassName = getClassNameFactory("Grid", styles);

export type GridProps = {
  numColumns: number;
  gap: number;
  items: Slot;
};

const CustomSlot = (props: any) => {
  return <span {...props} />;
};

export const GridInternal: ComponentConfig<GridProps> = {
  ai: {
    instructions:
      "Lays out children in equal-width columns that stack below 768px. Containers can be nested for more complex layouts.",
  },
  fields: {
    numColumns: {
      type: "number",
      label: "Number of columns",
      min: 1,
      max: 12,
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
      ai: {
        instructions: "The gap between children, in pixels.",
      },
    },
    items: {
      type: "slot",
      disallow: ["Hero", "Stats", "Logos"],
    },
  },
  defaultProps: {
    numColumns: 4,
    gap: 24,
    items: [],
  },
  render: ({ gap, numColumns, items: Items }) => {
    return (
      <Section>
        <Items
          as={CustomSlot}
          className={getClassName()}
          style={{
            gap,
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          }}
        />
      </Section>
    );
  },
};

export const Grid = withLayout(GridInternal);
