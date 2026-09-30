import React, { CSSProperties } from "react";
import { ComponentConfig } from "@/core";
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

const getClassName = getClassNameFactory("Logos", styles);

// Enough logos per copy to fill a wide screen, so the loop never shows a gap
const MIN_LOGOS_PER_COPY = 8;

export type LogosProps = SectionHeaderProps & {
  background?: SectionBackground;
  logos: {
    alt: string;
    imageUrl: string;
  }[];
  padding?: string;
};

export const Logos: ComponentConfig<{
  props: LogosProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions:
      "A page section with a strip of partner or customer logos that scrolls from right to left, and an optional header. Usually only needs an eyebrow such as 'Trusted by teams at'.",
  },
  fields: {
    background: sectionBackgroundField,
    ...sectionHeaderFields,
    logos: {
      type: "array",
      min: 3,
      max: 10,
      ai: {
        instructions: "Use 5 to 8 logos.",
      },
      getItemSummary: (item, i) => item.alt || `Logo #${i}`,
      defaultItemProps: {
        alt: "",
        imageUrl: "",
      },
      arrayFields: {
        alt: {
          type: "text",
          ai: {
            instructions: "The name of the organization the logo represents.",
          },
        },
        imageUrl: {
          type: "text",
          ai: {
            instructions:
              "Use a placehold.co wordmark for a fictional company, such as https://placehold.co/200x64/transparent/333333?text=Acme&font=montserrat. Change the text (use + for spaces) and optionally the font: montserrat, poppins, oswald, playfair-display, lora, or raleway. Keep the transparent background, since only the letters are shown, in the section's text color.",
          },
        },
      },
    },
    padding: sectionPaddingField,
  },
  defaultProps: {
    background: "default",
    eyebrow: "Trusted by teams at",
    logos: [
      {
        alt: "Acme",
        imageUrl:
          "https://placehold.co/200x64/transparent/333333?text=Acme&font=montserrat",
      },
      {
        alt: "Bluepeak",
        imageUrl:
          "https://placehold.co/200x64/transparent/333333?text=Bluepeak&font=poppins",
      },
      {
        alt: "Oakline",
        imageUrl:
          "https://placehold.co/200x64/transparent/333333?text=Oakline&font=playfair-display",
      },
      {
        alt: "Brightfield",
        imageUrl:
          "https://placehold.co/200x64/transparent/333333?text=Brightfield&font=raleway",
      },
      {
        alt: "Novara",
        imageUrl:
          "https://placehold.co/200x64/transparent/333333?text=Novara&font=oswald",
      },
    ],
  },
  render: ({
    background = "default",
    eyebrow,
    title,
    description,
    buttons,
    logos,
    padding,
  }) => {
    const hasHeader = eyebrow || title || description || buttons?.length;

    // Without a URL the mask has nothing to cut out and shows a solid block
    const visibleLogos = logos.filter((logo) => logo.imageUrl);

    // Repeat short lists so one copy is wide enough to fill the viewport
    const repeatsPerCopy = Math.ceil(
      MIN_LOGOS_PER_COPY / Math.max(visibleLogos.length, 1)
    );
    const logosPerCopy = repeatsPerCopy * visibleLogos.length;

    // Render the copy twice. The track slides left by one copy (-50%) and
    // starts over on an identical frame, so the loop looks seamless.
    const trackLogos = Array.from(
      { length: repeatsPerCopy * 2 },
      () => visibleLogos
    ).flat();

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

          <div className={getClassName("viewport")}>
            <ul
              className={getClassName("track")}
              style={
                {
                  "--logos-duration": `${logosPerCopy * 5}s`,
                } as CSSProperties
              }
            >
              {trackLogos.map((logo, i) => {
                // Check if this logo is a repeat for the animation
                const isRepeat = i >= visibleLogos.length;

                return (
                  <li
                    key={i}
                    className={getClassName("item")}
                    aria-hidden={isRepeat || undefined}
                  >
                    <span
                      className={getClassName("logo")}
                      role="img"
                      // Hide repeated logos from screen readers, and from the page without motion.
                      aria-label={logo.alt}
                      // Draw each logo as a mask filled with the text color,
                      // so it matches on any background and theme
                      style={
                        { "--logo": `url("${logo.imageUrl}")` } as CSSProperties
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Section>
    );
  },
};
