import { ElementType, ReactNode } from "react";
import { Button } from "@/core/components/Button";
import { getClassNameFactory } from "@/core/lib";
import { ArrayField, TextareaField, TextField } from "@/core/types";
import type { ObjectField } from "@/core/types";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("SectionHeader", styles);

export type SectionHeaderButton = {
  /** Label for the button */
  label: string;
  /** URL the button should link to */
  href: string;
  /** Variant style for the button */
  variant?: "primary" | "secondary";
};

export type SectionHeaderProps = {
  /** Optional short label above the title, such as a category or announcement */
  eyebrow?: string;
  /** Main title for the section */
  title?: ReactNode;
  /** Description or supporting text for the section */
  description?: ReactNode;
  /** Array of buttons to display as actions for the section */
  buttons?: SectionHeaderButton[];
};

/**
 * Fields for the SectionHeader component
 */
export const sectionHeaderFields: Required<
  ObjectField<SectionHeaderProps>["objectFields"]
> = {
  eyebrow: {
    type: "text",
    ai: {
      instructions:
        "Optional short label above the title, 2 to 4 words, such as a category or an announcement.",
    },
  },
  title: { type: "text", contentEditable: true },
  description: {
    type: "textarea",
    contentEditable: true,
  },
  buttons: {
    type: "array",
    max: 2,
    getItemSummary: (item) => item.label || "Button",
    arrayFields: {
      label: { type: "text", contentEditable: true },
      href: {
        type: "text",
        ai: {
          instructions:
            "Use a URL supplied by the user or verified in the business context. Otherwise, use '#'.",
        },
      },
      variant: {
        type: "select",
        ai: {
          instructions:
            "Use 'primary' for the main action in a group and 'secondary' for supporting actions.",
        },
        options: [
          { label: "primary", value: "primary" },
          { label: "secondary", value: "secondary" },
        ],
      },
    },
    defaultItemProps: {
      label: "Button",
      href: "#",
    },
  },
};

/**
 * Renders the SectionHeader component for a section of the page.
 */
export const SectionHeader = ({
  eyebrow,
  title,
  description,
  buttons = [],
  align = "start",
  size = "section",
  titleAs: Title = "h2",
}: SectionHeaderProps & {
  /** Alignment of the section header content. */
  align?: "start" | "center";
  /**
   * Size of the section header:
   * -
   */
  size?: "section" | "display";

  titleAs?: ElementType;
}) => (
  <div
    className={getClassName({
      center: align === "center",
      display: size === "display",
    })}
  >
    {eyebrow && <span className={getClassName("eyebrow")}>{eyebrow}</span>}
    {title && <Title className={getClassName("title")}>{title}</Title>}
    {description && (
      <div className={getClassName("description")}>{description}</div>
    )}
    {buttons.length > 0 && (
      <div className={getClassName("actions")}>
        {buttons.map((button, i) => (
          <Button
            key={i}
            href={button.href}
            variant={button.variant}
            size="large"
          >
            {button.label}
          </Button>
        ))}
      </div>
    )}
  </div>
);
