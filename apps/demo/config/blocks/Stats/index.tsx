/* eslint-disable @next/next/no-img-element */
import React, { CSSProperties } from "react";
import { ComponentConfig } from "@/core";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import {
  Section,
  sectionBackdropField,
  sectionBackgroundField,
  type SectionBackdrop,
  type SectionBackground,
} from "../../components/Section";
import {
  SectionHeader,
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";
import { FieldTabs } from "../../components/FieldTabs";
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("Stats", styles);

export type StatsProps = SectionHeaderProps & {
  layout: "row" | "split" | "bento" | "glass";
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
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

export const Stats: ComponentConfig<StatsProps> = {
  fields: {
    layout: {
      type: "select",
      label: "Style",
      options: [
        { label: "Row", value: "row" },
        { label: "Split", value: "split" },
        { label: "Bento", value: "bento" },
        { label: "Glass", value: "glass" },
      ],
    },
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    items: {
      type: "array",
      label: "Items",
      min: 2,
      max: 4,
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
          label: "Value",
          contentEditable: true,
        },
        label: {
          type: "text",
          label: "Label",
          contentEditable: true,
        },
      },
    },
    image: {
      type: "object",
      label: "Image",
      objectFields: {
        src: { type: "text", label: "URL" },
        alt: { type: "text", label: "Alt text" },
      },
    },
    backdrop: sectionBackdropField,
    padding: verticalPaddingField,
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      content={[
        fields.eyebrow,
        fields.title,
        fields.description,
        fields.buttons,
        fields.items,
        fields.image,
      ]}
      appearance={[fields.layout]}
      backgroundGroup={[fields.background, fields.backdrop]}
      layoutGroup={[fields.padding]}
    />
  ),
  defaultProps: {
    layout: "row",
    background: "default",
    backdrop: "none",
    padding: "160px",
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
    backdrop: data.props.layout === "glass" ? undefined : fields.backdrop,
    image:
      data.props.layout === "bento" || data.props.layout === "glass"
        ? fields.image
        : undefined,
  }),
  render: ({
    layout = "row",
    background = "default",
    backdrop = "none",
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
        backdrop={isGlass ? "none" : backdrop}
        spaced
        padding={padding}
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
