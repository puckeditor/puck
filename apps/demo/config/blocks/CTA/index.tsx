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
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("CTA", styles);

export type CTAProps = SectionHeaderProps & {
  layout: "centered" | "panel";
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  padding?: string;
};

export const CTA: ComponentConfig<CTAProps> = {
  fields: {
    layout: {
      type: "radio",
      label: "Style",
      options: [
        { label: "Centered", value: "centered" },
        { label: "Panel", value: "panel" },
      ],
    },
    background: {
      ...sectionBackgroundField,
    },
    ...sectionHeaderFields,
    backdrop: sectionBackdropField,
    padding: verticalPaddingField,
  },
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
