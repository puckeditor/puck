/* eslint-disable @next/next/no-img-element */
import React, { ReactNode } from "react";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { Section, type SectionBackground } from "../../components/Section";
import {
  SectionHeader,
  type SectionHeaderButton,
} from "../../components/SectionHeader";
import { PuckComponent, RichText, Slot } from "@/core/types";

const getClassName = getClassNameFactory("Hero", styles);

export type HeroProps = {
  quote?: { index: number; label: string };
  layout: "split" | "centered" | "cinematic" | "browser";
  background?: SectionBackground;
  eyebrow?: string;
  title: string | ReactNode;
  description: RichText;
  buttons: SectionHeaderButton[];
  image?: {
    content?: Slot;
    mode?: "image" | "custom";
    source?: {
      src?: string;
      alt?: string;
    };
  };
  highlight?: {
    value?: string;
    label?: string;
  };
  padding: string;
};

export const Hero: PuckComponent<HeroProps> = ({
  layout = "split",
  background,
  eyebrow,
  title,
  description,
  buttons,
  image,
  highlight,
  padding,
  puck,
}) => {
  const isCinematic = layout === "cinematic";
  const src = image?.source?.src;
  const alt = image?.source?.alt ?? "";

  const media =
    image?.mode === "custom" && image.content ? (
      <image.content className={getClassName("slot")} />
    ) : src ? (
      <img className={getClassName("image")} src={src} alt={alt} />
    ) : null;

  return (
    <Section
      className={getClassName({ [layout]: true })}
      background={isCinematic ? "default" : background}
      glow={!isCinematic}
      style={{ paddingTop: padding, paddingBottom: padding }}
    >
      {isCinematic && src && (
        <img className={getClassName("backdrop")} src={src} alt={alt} />
      )}

      <div className={getClassName("inner")}>
        <SectionHeader
          align={
            layout === "centered" || layout === "browser" ? "center" : "start"
          }
          size="display"
          titleAs="h1"
          eyebrow={eyebrow}
          title={title}
          description={description}
          buttons={buttons}
          isEditing={puck.isEditing}
        />

        {!isCinematic && media && (
          <div className={getClassName("media")}>
            {layout === "browser" && (
              <div className={getClassName("browserBar")} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}

            {media}

            {layout === "split" && highlight?.value && (
              <div className={getClassName("highlight")}>
                <strong className={getClassName("highlightValue")}>
                  {highlight.value}
                </strong>
                {highlight.label && (
                  <span className={getClassName("highlightLabel")}>
                    {highlight.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
};

export default Hero;
