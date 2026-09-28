/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section } from "../../components/Section";

const getClassName = getClassNameFactory("Logos", styles);

export type LogosProps = {
  logos: {
    alt: string;
    imageUrl: string;
  }[];
};

export const Logos: ComponentConfig<LogosProps> = {
  ai: {
    instructions:
      "Displays a collection of brand logos on the page as white silhouettes.",
  },
  fields: {
    logos: {
      type: "array",
      getItemSummary: (item, i) => item.alt || `Feature #${i}`,
      defaultItemProps: {
        alt: "",
        imageUrl: "",
      },
      arrayFields: {
        alt: {
          type: "text",
          ai: {
            instructions: "Describe the organization represented by the logo.",
          },
        },
        imageUrl: {
          type: "text",
          ai: {
            instructions:
              "Use a placehold.co wordmark for a fictional company, such as https://placehold.co/200x64/transparent/333333?text=Acme&font=montserrat. Change the text (use + for spaces) and optionally the font: montserrat, poppins, oswald, playfair-display, lora, or raleway. Keep the transparent background and 333333 color so the logo renders as a white wordmark.",
          },
        },
      },
    },
  },
  defaultProps: {
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
  render: ({ logos }) => {
    return (
      <Section className={getClassName()}>
        <div className={getClassName("items")}>
          {logos.map((item, i) => (
            <div key={i} className={getClassName("item")}>
              <img
                className={getClassName("image")}
                alt={item.alt}
                src={item.imageUrl}
                height={64}
              ></img>
            </div>
          ))}
        </div>
      </Section>
    );
  },
};
