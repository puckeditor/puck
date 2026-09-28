/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";

const getClassName = getClassNameFactory("Stats", styles);

export type StatsProps = {
  items: {
    title: string;
    description: string;
  }[];
};

export const Stats: ComponentConfig<StatsProps> = {
  ai: {
    instructions:
      "Displays a group of statistics. Precede a top-level Stats component with a Heading and a short Text description.",
  },
  fields: {
    items: {
      ai: {
        instructions:
          "Prefer 2 or 4 statistics and keep the count even. If the user requests a specific count, use that count.",
      },
      type: "array",
      min: 2,
      max: 6,
      getItemSummary: (item, i) =>
        item.title && item.description ? (
          <>
            {item.title} ({item.description})
          </>
        ) : (
          `Feature #${i}`
        ),
      defaultItemProps: {
        title: "Stat",
        description: "1,000",
      },
      arrayFields: {
        title: {
          type: "text",
          contentEditable: true,
          ai: {
            instructions:
              "Write a label of 3 words or fewer, such as Revenue, Users reached, or Costs saved.",
          },
        },
        description: {
          type: "text",
          contentEditable: true,
          ai: {
            instructions:
              "Write the displayed value in 3 words or fewer, such as 15K, 50%, $10,000, or 5M kg, rather than a sentence.",
          },
        },
      },
    },
  },
  defaultProps: {
    items: [
      {
        title: "Stat",
        description: "1,000",
      },
      {
        title: "Stat",
        description: "1,000",
      },
    ],
  },
  render: ({ items }) => {
    return (
      <Section className={getClassName()} maxWidth={"916px"}>
        <div className={getClassName("items")}>
          {items.map((item, i) => (
            <div key={i} className={getClassName("item")}>
              <div className={getClassName("label")}>{item.title}</div>
              <div className={getClassName("value")}>{item.description}</div>
            </div>
          ))}
        </div>
      </Section>
    );
  },
};
