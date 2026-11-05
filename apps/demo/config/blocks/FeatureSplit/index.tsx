/* eslint-disable @next/next/no-img-element */
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
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";
import { Icon, iconField } from "../../components/Icon";
import { verticalPaddingField } from "../../components/Layout";

const getClassName = getClassNameFactory("FeatureSplit", styles);

export type FeatureSplitProps = SectionHeaderProps & {
  background?: SectionBackground;
  backdrop?: SectionBackdrop;
  mediaPosition: "right" | "left";
  features: {
    icon?: string;
    title: string;
    description: string;
  }[];
  image?: {
    src?: string;
    alt?: string;
  };
  padding?: string;
};

export const FeatureSplit: ComponentConfig<FeatureSplitProps> = {
  label: "Feature Split",
  fields: {
    background: sectionBackgroundField,
    mediaPosition: {
      type: "radio",
      label: "Image position",
      options: [
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
      ],
    },
    ...sectionHeaderFields,
    features: {
      type: "array",
      label: "Features",
      max: 4,
      getItemSummary: (item) => item.title || "Feature",
      defaultItemProps: {
        icon: "sparkles",
        title: "Feature",
        description: "Description",
      },
      arrayFields: {
        icon: iconField,
        title: {
          type: "text",
          label: "Title",
          contentEditable: true,
        },
        description: {
          type: "textarea",
          label: "Description",
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
  defaultProps: {
    background: "default",
    backdrop: "none",
    padding: "160px",
    mediaPosition: "right",
    title: "Designed around you",
    description: "A closer look at what makes it different.",
    features: [
      {
        icon: "sparkles",
        title: "Thoughtful details",
        description: "Every part is designed with care, so it simply works.",
      },
      {
        icon: "shield-check",
        title: "Built to last",
        description: "Consistent quality you can count on, every time.",
      },
      {
        icon: "heart",
        title: "Loved by customers",
        description: "People come back to it again and again.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
      alt: "Bright modern interior",
    },
  },
  render: ({
    background = "default",
    backdrop = "none",
    mediaPosition = "right",
    eyebrow,
    title,
    description,
    buttons,
    features = [],
    image,
    padding,
  }) => {
    return (
      <Section
        className={getClassName({ mediaLeft: mediaPosition === "left" })}
        background={background}
        backdrop={backdrop}
        spaced
        padding={padding}
      >
        <div className={getClassName("inner")}>
          <div className={getClassName("content")}>
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              buttons={buttons}
            />

            {features.length > 0 && (
              <ul className={getClassName("features")}>
                {features.map((feature, i) => (
                  <li key={i} className={getClassName("feature")}>
                    {feature.icon && (
                      <span className={getClassName("featureIcon")}>
                        <Icon name={feature.icon} size={20} />
                      </span>
                    )}
                    <div>
                      <h3 className={getClassName("featureTitle")}>
                        {feature.title}
                      </h3>
                      <p className={getClassName("featureDescription")}>
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {image?.src && (
            <img
              className={getClassName("image")}
              src={image.src}
              alt={image.alt ?? ""}
            />
          )}
        </div>
      </Section>
    );
  },
};
