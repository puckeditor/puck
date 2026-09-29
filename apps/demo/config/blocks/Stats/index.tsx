/* eslint-disable @next/next/no-img-element */
import React, { CSSProperties } from "react";
import { ComponentConfig } from "@/core";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import {
  Section,
  sectionBackgroundField,
  sectionPaddingField,
  type SectionBackground,
} from "../../components/Section";
import {
  SectionHeader,
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";

const getClassName = getClassNameFactory("Stats", styles);

export type StatsProps = SectionHeaderProps & {
  layout: "row" | "split" | "bento" | "glass";
  background?: SectionBackground;
  items: {
    value: string;
    label: string;
  }[];
  image?: {
    src?: string;
    alt?: string;
  };
  padding?: string;
};

export const Stats: ComponentConfig<{
  props: StatsProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions: "A section of key numbers with its own optional header.",
  },
  fields: {
    layout: {
      type: "select",
      options: [
        { label: "Row", value: "row" },
        { label: "Split", value: "split" },
        { label: "Bento", value: "bento" },
        { label: "Glass", value: "glass" },
      ],
      ai: {
        instructions:
          "Use 'row' by default. Use 'split' when the numbers need a longer explanation beside them. Use 'bento' to feature one standout number. Use 'glass' over a photo for visual subjects such as cars, travel, food or events.",
      },
    },
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    items: {
      type: "array",
      min: 2,
      max: 4,
      ai: {
        instructions:
          "Prefer 3 or 4 statistics. If the user requests a specific count, use that count. In the bento layout, put the featured statistic first.",
      },
      getItemSummary: (item) =>
        item.value && item.label ? (
          <>
            {item.label} ({item.value})
          </>
        ) : (
          "Statistic"
        ),
      defaultItemProps: {
        label: "Stat",
        value: "1,000",
      },
      arrayFields: {
        value: {
          type: "text",
          contentEditable: true,
          ai: {
            instructions:
              "The number shown large, 3 words or fewer, such as 15K, 50%, $10,000 or 5M kg.",
          },
        },
        label: {
          type: "text",
          contentEditable: true,
          ai: {
            instructions:
              "A label of 3 words or fewer, such as Revenue, Users reached or Costs saved.",
          },
        },
      },
    },
    image: {
      type: "object",
      objectFields: {
        src: { type: "text", ai: { stream: false } },
        alt: { type: "text" },
      },
      ai: {
        bind: "puck:unsplash",
        instructions:
          "A photo for the featured tile in the bento layout and the background of the glass layout. Other layouts ignore it.",
      },
    },
    padding: sectionPaddingField,
  },
  defaultProps: {
    layout: "row",
    background: "default",
    title: "By the numbers",
    items: [
      { value: "20M+", label: "Users reached" },
      { value: "$1.5M", label: "Cost savings" },
      { value: "99.9%", label: "Uptime" },
    ],
  },
  resolveFields: async (data, { fields }) => ({
    ...fields,
    background: data.props.layout === "glass" ? undefined : fields.background,
    image:
      data.props.layout === "bento" || data.props.layout === "glass"
        ? fields.image
        : undefined,
  }),
  render: ({
    layout = "row",
    background = "default",
    eyebrow,
    title,
    description,
    buttons,
    items,
    image,
    padding,
  }) => {
    const hasHeader = eyebrow || title || description || buttons?.length;
    const hasImage = !!image?.src && (layout === "bento" || layout === "glass");
    const isGlass = layout === "glass";
    const isRow = layout === "row";
    const isBento = layout === "bento";

    return (
      <Section
        className={getClassName({ [layout]: true, hasImage })}
        // The glass layout sits on its photo, or on the inverse background
        // when there is no photo
        background={isGlass ? (hasImage ? "default" : "inverse") : background}
        glow={!isGlass && background === "inverse"}
        spaced
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {isGlass && hasImage && (
          <img
            className={getClassName("backdrop")}
            src={image?.src}
            alt={image?.alt ?? ""}
          />
        )}

        <div className={getClassName("inner")}>
          {hasHeader && (
            <SectionHeader
              align={isRow || isGlass ? "center" : "start"}
              eyebrow={eyebrow}
              title={title}
              description={description}
              buttons={buttons}
            />
          )}

          <div
            className={getClassName("items")}
            // The bento's featured tile spans the rows of the tiles beside it
            style={
              { "--stats-featured-rows": items.length - 1 } as CSSProperties
            }
          >
            {items.map((item, i) => (
              <div key={i} className={getClassName("item")}>
                {isBento && i === 0 && hasImage && (
                  <img
                    className={getClassName("itemImage")}
                    src={image?.src}
                    alt={image?.alt ?? ""}
                  />
                )}
                <div className={getClassName("value")}>{item.value}</div>
                <div className={getClassName("label")}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  },
};
