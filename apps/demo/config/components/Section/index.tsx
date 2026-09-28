import { CSSProperties, forwardRef, ReactNode } from "react";
import { RadioField } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";

const getClassName = getClassNameFactory("Section", styles);

export type SectionBackground = "default" | "subtle" | "inverse";

export type SectionProps = {
  className?: string;
  children: ReactNode;
  maxWidth?: string;
  style?: CSSProperties;
  /**
   * Background style for the section.
   * - 'default' applies a transparent background
   * - 'subtle' applies a Puck theme subtle background
   * - 'inverse' applies an Puck theme inverse background
   */
  background?: SectionBackground;
  /**
   * Whether to apply a soft azure and rose glow behind the section content.
   */
  glow?: boolean;
};

/** Field for the section background options */
export const sectionBackgroundField: RadioField = {
  type: "radio",
  label: "Background",
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

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      children,
      className,
      maxWidth = "1280px",
      style = {},
      background = "default",
      glow = false,
    },
    ref
  ) => {
    return (
      <div
        className={`${getClassName({
          subtle: background === "subtle",
          inverse: background === "inverse",
          glow,
        })}${className ? ` ${className}` : ""}`}
        style={{
          ...style,
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
