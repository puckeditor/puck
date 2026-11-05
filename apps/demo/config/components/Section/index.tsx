import { CSSProperties, forwardRef, ReactNode } from "react";
import { RadioField } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";

const getClassName = getClassNameFactory("Section", styles);

export type SectionBackground = "default" | "subtle" | "inverse";

export type SectionBackdrop = "none" | "grid";

export type SectionProps = {
  className?: string;
  children: ReactNode;
  maxWidth?: string;
  style?: CSSProperties;
  /**
   * Background style for the section.
   * - 'default' applies a transparent background
   * - 'subtle' applies the site's subtle background
   * - 'inverse' applies the site's dark background
   */
  background?: SectionBackground;
  /**
   * Decoration behind the section content.
   * - 'none' shows nothing
   * - 'grid' shows a faint grid that fades out before the section's edges
   */
  backdrop?: SectionBackdrop;
  /** Whether to add the default vertical padding.   */
  spaced?: boolean;
  /**
   * The vertical padding of a spaced section, such as "96px". It shrinks on
   * smaller screens, but not below 80px.
   */
  padding?: string;
};

/** Field for the section background options */
export const sectionBackgroundField: RadioField = {
  type: "radio",
  label: "Color",
  options: [
    { label: "Default", value: "default" },
    { label: "Subtle", value: "subtle" },
    { label: "Inverse", value: "inverse" },
  ],
  ai: {
    instructions:
      "Use 'default' for most sections. Use 'subtle' or 'inverse' to set a section apart, and 'inverse' at most twice per page.",
  },
};

/** Field for the section backdrop options */
export const sectionBackdropField: RadioField = {
  type: "radio",
  label: "Pattern",
  options: [
    { label: "None", value: "none" },
    { label: "Grid", value: "grid" },
  ],
  ai: {
    instructions:
      "Use 'none' for most sections. Use 'grid' to give one or two standout sections, such as the hero, a faint grid behind the content.",
  },
};

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      children,
      className,
      maxWidth = "1280px",
      style = {},
      background = "default",
      backdrop = "none",
      spaced = false,
      padding,
    },
    ref
  ) => {
    return (
      <div
        className={`${getClassName({
          subtle: background === "subtle",
          inverse: background === "inverse",
          grid: backdrop === "grid",
          spaced,
        })}${className ? ` ${className}` : ""}`}
        style={{
          ...style,
          ...(padding ? { "--section-padding": padding } : {}),
        }}
        ref={ref}
      >
        <div className={getClassName("inner")} style={{ maxWidth }}>
          {children}
        </div>
      </div>
    );
  }
);
