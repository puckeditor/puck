/* eslint-disable @next/next/no-img-element */
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
  sectionHeaderFields,
  type SectionHeaderProps,
} from "../../components/SectionHeader";
import { Icon, iconField } from "../../components/Icon";

const getClassName = getClassNameFactory("FeatureSplit", styles);

export type FeatureSplitProps = SectionHeaderProps & {
  background?: SectionBackground;
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

export const FeatureSplit: ComponentConfig<{
  props: FeatureSplitProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  label: "Feature Split",
  ai: {
    instructions:
      "A page section with a photo beside a header and a short list of features, for explaining one topic in depth.",
  },
  fields: {
    background: sectionBackgroundField,
    mediaPosition: {
      type: "radio",
      label: "Image position",
      options: [
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
      ],
      ai: {
        instructions:
          "Use 'right' by default. When Feature Splits follow each other, alternate the side.",
      },
    },
    ...sectionHeaderFields,
    features: {
      type: "array",
      max: 4,
      ai: {
        instructions: "Use 3 or 4 features.",
      },
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
          contentEditable: true,
          ai: {
            instructions: "The feature's name, 2 to 5 words.",
          },
        },
        description: {
          type: "textarea",
          contentEditable: true,
          ai: {
            instructions: "One sentence on why this feature matters.",
          },
        },
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
        instructions: "A photo of this section's subject.",
        stream: false,
      },
    },
    padding: sectionPaddingField,
  },
  defaultProps: {
    background: "default",
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
        glow={background === "inverse"}
        spaced
        style={{ paddingTop: padding, paddingBottom: padding }}
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
