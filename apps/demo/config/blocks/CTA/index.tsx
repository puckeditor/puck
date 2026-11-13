import React from "react";
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
  SectionHeaderActions,
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";
import { FieldTabs } from "../../components/FieldTabs";
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("CTA", styles);

export type CTAProps = SectionHeaderProps & {
  layout: "centered" | "panel";
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  padding?: string;
};

export const CTA: ComponentConfig<CTAProps> = {
  ai: {
    instructions:
      "A page section with a call to action that asks the reader to take a next step. Usually the last section of the page.",
  },
  fields: {
    layout: {
      type: "radio",
      label: "Style",
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
      appearance={[fields.layout]}
      backgroundGroup={[fields.background, fields.backdrop]}
      layoutGroup={[fields.padding]}
    />
  ),
  defaultProps: {
    layout: "centered",
    background: "default",
    backdrop: "none",
    padding: "160px",
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
    backdrop: data.props.layout === "panel" ? undefined : fields.backdrop,
  }),
  render: ({
    layout = "centered",
    background = "default",
    backdrop = "none",
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
        backdrop={isPanel ? "none" : backdrop}
        spaced
        padding={padding}
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
