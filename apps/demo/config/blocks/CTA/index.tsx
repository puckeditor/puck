import React from "react";
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
  SectionHeaderActions,
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";

const getClassName = getClassNameFactory("CTA", styles);

export type CTAProps = SectionHeaderProps & {
  layout: "centered" | "panel";
  background?: SectionBackground;
  padding?: string;
};

export const CTA: ComponentConfig<{
  props: CTAProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions:
      "A call to action that asks the reader to take a next step. Usually the last section of the page.",
  },
  fields: {
    layout: {
      type: "radio",
      options: [
        { label: "Centered", value: "centered" },
        { label: "Panel", value: "panel" },
      ],
      ai: {
        instructions:
          "Use 'centered' by default. Use 'panel' to set the call to action apart in a dark card, with the description beside the title.",
      },
    },
    background: {
      ...sectionBackgroundField,
      ai: {
        instructions: `${sectionBackgroundField.ai?.instructions} The panel layout ignores it.`,
      },
    },
    ...sectionHeaderFields,
    padding: sectionPaddingField,
  },
  defaultProps: {
    layout: "centered",
    background: "default",
    title: "Ready to get started?",
    description: "Take the next step today. It only takes a few minutes.",
    buttons: [
      { label: "Get started", href: "#", variant: "primary" },
      { label: "Contact us", href: "#", variant: "secondary" },
    ],
  },
  resolveFields: async (data, { fields }) => ({
    ...fields,
    background: data.props.layout === "panel" ? undefined : fields.background,
  }),
  render: ({
    layout = "centered",
    background = "default",
    eyebrow,
    title,
    description,
    buttons = [],
    padding,
  }) => {
    const isPanel = layout === "panel";

    return (
      <Section
        background={isPanel ? "default" : background}
        spaced
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {isPanel ? (
          <div className={getClassName("panel")}>
            <div className={getClassName("panelHeader")}>
              <SectionHeader eyebrow={eyebrow} title={title} />
            </div>

            {description && (
              <div className={getClassName("panelDescription")}>
                {description}
              </div>
            )}

            {buttons.length > 0 && (
              <div className={getClassName("panelActions")}>
                <SectionHeaderActions buttons={buttons} />
              </div>
            )}
          </div>
        ) : (
          <SectionHeader
            align="center"
            eyebrow={eyebrow}
            title={title}
            description={description}
            buttons={buttons}
          />
        )}
      </Section>
    );
  },
};
