import React from "react";
import { Plus } from "lucide-react";
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
import FAQItem from "./faq-item";
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("FAQ", styles);

export type FAQProps = SectionHeaderProps & {
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  items: {
    question: string;
    answer: string;
  }[];
  padding?: string;
};

export const FAQ: ComponentConfig<FAQProps> = {
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    items: {
      type: "array",
      label: "Items",
      min: 2,
      max: 10,
      getItemSummary: (item) => item.question || "Question",
      defaultItemProps: {
        question: "Question",
        answer: "Answer",
      },
      arrayFields: {
        question: {
          type: "text",
          label: "Question",
          contentEditable: true,
        },
        answer: {
          type: "textarea",
          label: "Answer",
          contentEditable: true,
        },
      },
    },
    backdrop: sectionBackdropField,
    padding: verticalPaddingField,
  },
  defaultProps: {
    background: "default",
    backdrop: "none",
    padding: "160px",
    title: "Frequently asked questions",
    description:
      "Can't find what you're looking for? Get in touch and we'll help.",
    items: [
      {
        question: "How do I get started?",
        answer:
          "Get in touch and we'll walk you through the first steps. Most people are up and running the same day.",
      },
      {
        question: "How much does it cost?",
        answer:
          "It depends on what you need. Contact us for a quote, or see the pricing page for our standard options.",
      },
      {
        question: "How long does it take?",
        answer:
          "Most requests are handled within a few days. We'll give you a clear timeline before we begin.",
      },
      {
        question: "Can I make changes later?",
        answer:
          "Yes. You can change or cancel your request at any time before we start.",
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
    items = [],
    padding,
  }) => {
    const hasHeader = eyebrow || title || description || buttons?.length;

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
              eyebrow={eyebrow}
              title={title}
              description={description}
              buttons={buttons}
            />
          )}

          <div className={getClassName("items")}>
            {items.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </Section>
    );
  },
};
