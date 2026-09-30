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

const getClassName = getClassNameFactory("Bento", styles);
const getTileClassName = getClassNameFactory("BentoTile", styles);

export type BentoProps = SectionHeaderProps & {
  background?: SectionBackground;
  tiles: {
    title: string;
    description: string;
    icon?: string;
    image?: {
      src?: string;
      alt?: string;
    };
  }[];
  padding?: string;
};

export const Bento: ComponentConfig<{
  props: BentoProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions:
      "A page section with a grid of tiles in mixed sizes, led by one large tile, for showcasing highlights, products or places with photos.",
  },
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    tiles: {
      type: "array",
      min: 3,
      max: 5,
      ai: {
        instructions:
          "Use 4 or 5 tiles. The first tile is the largest, so give it a photo.",
      },
      getItemSummary: (item, i = 0) => item.title || `Tile ${i + 1}`,
      defaultItemProps: {
        title: "Tile",
        description: "Description",
        icon: "sparkles",
      },
      arrayFields: {
        title: {
          type: "text",
          contentEditable: true,
          ai: {
            instructions: "2 to 5 words.",
          },
        },
        description: {
          type: "textarea",
          contentEditable: true,
          ai: {
            instructions: "One short sentence.",
          },
        },
        icon: {
          ...iconField,
          ai: {
            instructions: "Shown only on tiles without a photo.",
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
              "Photo that fills the tile, with the text over it.",
            stream: false,
          },
        },
      },
    },
    padding: sectionPaddingField,
  },
  defaultProps: {
    background: "default",
    title: "Take a closer look",
    description: "The highlights, at a glance.",
    tiles: [
      {
        title: "Made for the moment",
        description: "Everything comes together in one place.",
        image: {
          src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
          alt: "Sunrise over a mountain valley",
        },
      },
      {
        title: "Thoughtful design",
        description: "Every detail is considered.",
        icon: "sparkles",
      },
      {
        title: "Made to enjoy",
        description: "Simple from the very first moment.",
        icon: "heart",
      },
      {
        title: "Built to last",
        description: "Quality you can count on.",
        icon: "shield-check",
      },
      {
        title: "Worth the trip",
        description: "Views you'll want to come back to.",
        image: {
          src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
          alt: "Green hills under a cloudy sky",
        },
      },
    ],
  },
  render: ({
    background = "default",
    eyebrow,
    title,
    description,
    buttons,
    tiles = [],
    padding,
  }) => {
    const hasHeader = eyebrow || title || description || buttons?.length;

    return (
      <Section
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

          <ul className={getClassName("tiles")}>
            {tiles.map((tile, i) => {
              const hasImage = !!tile.image?.src;

              return (
                <li key={i} className={getTileClassName({ photo: hasImage })}>
                  {hasImage ? (
                    <img
                      className={getTileClassName("image")}
                      src={tile.image?.src}
                      alt={tile.image?.alt ?? ""}
                    />
                  ) : (
                    <Icon name={tile.icon} size={24} />
                  )}

                  <div className={getTileClassName("text")}>
                    <h3 className={getTileClassName("title")}>{tile.title}</h3>
                    <p className={getTileClassName("description")}>
                      {tile.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>
    );
  },
};
