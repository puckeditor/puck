/* eslint-disable @next/next/no-img-element */
import React, { CSSProperties } from "react";
import { ComponentConfig } from "@/core/types";
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

const getClassName = getClassNameFactory("Steps", styles);

const formatNumber = (n: number) => String(n).padStart(2, "0");

export type StepsProps = SectionHeaderProps & {
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  steps: {
    title: string;
    description: string;
    image?: {
      src?: string;
      alt?: string;
    };
  }[];
  padding?: string;
};

export const Steps: ComponentConfig<StepsProps> = {
  ai: {
    instructions:
      "A page section of numbered steps the reader follows in order, such as how to book, order or get started, with its own optional header.",
  },
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    steps: {
      type: "array",
      label: "Steps",
      min: 2,
      max: 6,
      ai: {
        instructions: "Use 2 or 4 steps, in the order the reader follows them.",
      },
      getItemSummary: (item, i = 0) => item.title || `Step ${i + 1}`,
      defaultItemProps: {
        title: "Step",
        description: "Description",
      },
      arrayFields: {
        title: {
          type: "text",
          label: "Title",
          contentEditable: true,
          ai: {
            instructions:
              "The action for this step, 2 to 5 words, such as 'Book your seats'.",
          },
        },
        description: {
          type: "textarea",
          label: "Description",
          contentEditable: true,
          ai: {
            instructions: "What happens in this step, in 1 or 2 sentences.",
          },
        },
        image: {
          type: "object",
          label: "Image",
          objectFields: {
            src: { type: "text", label: "URL" },
            alt: { type: "text", label: "Alt text" },
          },
          ai: {
            bind: "puck:unsplash",
            instructions:
              "Optional photo for this step. Give every step a photo, or none of them.",
            stream: false,
          },
        },
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
        fields.steps,
      ]}
      backgroundGroup={[fields.background, fields.backdrop]}
      layoutGroup={[fields.padding]}
    />
  ),
  defaultProps: {
    background: "default",
    backdrop: "none",
    padding: "160px",
    title: "How it works",
    steps: [
      {
        title: "Pick a date",
        description: "Choose the day and time that suit you best.",
      },
      {
        title: "Book online",
        description: "Reserve in a few clicks and get a confirmation by email.",
      },
    ],
  },
  render: ({
    background = "default",
    backdrop = "none",
    eyebrow,
    title,
    description,
    buttons,
    steps = [],
    padding,
  }) => {
    const hasHeader = eyebrow || title || description || buttons?.length;
    const total = formatNumber(steps.length);

    return (
      <Section
        className={getClassName({ inverse: background === "inverse" })}
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
              buttons={buttons}
            />
          )}

          <ol className={getClassName("list")}>
            {steps.map((step, i) => {
              const number = formatNumber(i + 1);

              return (
                <li
                  key={i}
                  className={getClassName("step")}
                  style={{ "--step-index": i } as CSSProperties}
                >
                  <div className={getClassName("content")}>
                    <span className={getClassName("label")} aria-hidden>
                      {number} / {total}
                    </span>
                    <h3 className={getClassName("title")}>{step.title}</h3>
                    <p className={getClassName("description")}>
                      {step.description}
                    </p>
                  </div>

                  {step.image?.src ? (
                    <img
                      className={getClassName("image")}
                      src={step.image.src}
                      alt={step.image.alt ?? ""}
                    />
                  ) : (
                    <span className={getClassName("number")} aria-hidden>
                      {number}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Section>
    );
  },
};
