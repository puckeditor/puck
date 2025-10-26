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
  label: "Stats",
  fields: {
    items: {
      label: "Statistics",
      type: "array",
      getItemSummary: (item, i) =>
        item.title || `Stat #${i !== undefined ? i + 1 : 1}`,
      defaultItemProps: {
        title: "Stat Label",
        description: "1,000",
      },
      arrayFields: {
        title: {
          label: "Label",
          type: "text",
          contentEditable: true,
          placeholder: "Total Users",
        },
        description: {
          label: "Value",
          type: "text",
          contentEditable: true,
          placeholder: "1,234,567",
        },
      },
    },
  },
  defaultProps: {
    items: [
      {
        title: "Active Users",
        description: "1,234",
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
