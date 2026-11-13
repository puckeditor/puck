import React, { CSSProperties } from "react";
import { ComponentConfig, Slot } from "@/core/types";
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
  SectionHeaderActions,
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";
import { FieldTabs } from "../../components/FieldTabs";
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("FeatureGrid", styles);

export type FeatureGridProps = SectionHeaderProps & {
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  columns: 2 | 3 | 4;
  cardMode: "card" | "flat";
  cards: Slot;
  padding?: string;
};

export const FeatureGrid: ComponentConfig<FeatureGridProps> = {
  label: "Feature Grid",
  ai: {
    instructions: "A page section with an optional header and a grid of Cards.",
  },
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    columns: {
      type: "number",
      label: "Columns",
      min: 2,
      max: 4,
      ai: {
        instructions:
          "Use 3 by default. Use 2 for 2 or 4 Cards and 4 for 4 or 8 Cards.",
      },
    },
    cardMode: {
      type: "radio",
      label: "Card style",
      options: [
        { label: "Card", value: "card" },
        { label: "Flat", value: "flat" },
      ],
      ai: {
        instructions:
          "The style of every Card in this grid. Use 'card' for elevated, left-aligned cards or 'flat' for transparent, centered ones.",
      },
    },
    cards: {
      type: "slot",
      allow: ["Card"],
      ai: {
        instructions: "Add 3 to 6 Cards.",
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
      ]}
      appearance={[fields.columns, fields.cardMode]}
      backgroundGroup={[fields.background, fields.backdrop]}
      layoutGroup={[fields.padding]}
    />
  ),
  defaultProps: {
    background: "default",
    backdrop: "none",
    padding: "160px",
    columns: 3,
    cardMode: "card",
    title: "Everything you need",
    description: "A few reasons people keep coming back.",
    cards: [
      {
        type: "Card",
        props: {
          title: "Fast",
          description: "Pages load quickly on every device.",
          icon: "rocket",
          mode: "card",
        },
      },
      {
        type: "Card",
        props: {
          title: "Secure",
          description: "Your data stays protected and private.",
          icon: "shield-check",
          mode: "card",
        },
      },
      {
        type: "Card",
        props: {
          title: "Delightful",
          description: "Details that make every visit feel easy.",
          icon: "sparkles",
          mode: "card",
        },
      },
    ],
  },
  resolveData: (data) => {
    // Overwrite the mode of each Card with the selected cardMode
    return {
      ...data,
      props: {
        ...data.props,
        cards: data.props.cards.map((card) =>
          card.type === "Card"
            ? { ...card, props: { ...card.props, mode: data.props.cardMode } }
            : card
        ),
      },
    };
  },
  render: ({
    background = "default",
    backdrop = "none",
    columns = 3,
    eyebrow,
    title,
    description,
    buttons,
    cards: Cards,
    padding,
  }) => {
    const hasHeader = eyebrow || title || description;

    return (
      <Section
        background={background}
        backdrop={backdrop}
        spaced
        padding={padding}
      >
        <div className={getClassName("inner")}>
          {hasHeader && (
            <SectionHeader
              align="center"
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          )}
          <Cards
            className={getClassName("cards")}
            style={{ "--feature-grid-columns": columns } as CSSProperties}
          />
          {buttons && buttons.length > 0 && (
            <div className={getClassName("actions")}>
              <SectionHeaderActions buttons={buttons} />
            </div>
          )}
        </div>
      </Section>
    );
  },
};
