/* eslint-disable @next/next/no-img-element */
import React, { CSSProperties } from "react";
import { ComponentConfig } from "@/core/types";
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

const getClassName = getClassNameFactory("Steps", styles);

const formatNumber = (n: number) => String(n).padStart(2, "0");

export type StepsProps = SectionHeaderProps & {
  background?: SectionBackground;
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

export const Steps: ComponentConfig<{
  props: StepsProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions:
      "A page section of numbered steps the reader follows in order, such as how to book, order or get started, with its own optional header.",
  },
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    steps: {
      type: "array",
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
          contentEditable: true,
          ai: {
            instructions:
              "The action for this step, 2 to 5 words, such as 'Book your seats'.",
          },
        },
        description: {
          type: "textarea",
          contentEditable: true,
          ai: {
            instructions: "What happens in this step, in 1 or 2 sentences.",
          },
        },
        image: {
          type: "object",
          objectFields: {
            src: { type: "text" },
            alt: { type: "text" },
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
    padding: sectionPaddingField,
  },
  defaultProps: {
    background: "default",
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
        glow={background === "inverse"}
        spaced
        style={{ paddingTop: padding, paddingBottom: padding }}
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
