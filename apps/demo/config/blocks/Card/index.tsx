/* eslint-disable @next/next/no-img-element */
import React, { ReactElement } from "react";
import { ComponentConfig } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import dynamic from "next/dynamic";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { withLayout, WithLayout } from "../../components/Layout";

const getClassName = getClassNameFactory("Card", styles);

const cardIconNames = [
  "align-left",
  "feather",
  "git-merge",
  "github",
  "pen-tool",
  "plug",
  "activity",
  "badge-check",
  "book-open",
  "briefcase",
  "building-2",
  "chart-no-axes-column-increasing",
  "circle-check",
  "cloud",
  "code",
  "database",
  "globe",
  "heart",
  "lightbulb",
  "lock",
  "rocket",
  "shield-check",
  "sparkles",
  "users",
] as const satisfies readonly (keyof typeof dynamicIconImports)[];

const icons = cardIconNames.reduce<Record<string, ReactElement>>(
  (acc, iconName) => {
    const El = dynamic(dynamicIconImports[iconName]);

    return {
      ...acc,
      [iconName]: <El />,
    };
  },
  {}
);

const iconOptions = cardIconNames.map((iconName) => ({
  label: iconName,
  value: iconName,
}));

export type CardProps = WithLayout<{
  title: string;
  description: string;
  icon?: string;
  mode: "flat" | "card";
}>;

const CardInner: ComponentConfig<CardProps> = {
  ai: {
    instructions:
      "Use Cards to enumerate related features or items. Keep every Card in the same container on the same mode.",
  },
  fields: {
    title: {
      type: "text",
      contentEditable: true,
    },
    description: {
      type: "textarea",
      contentEditable: true,
    },
    icon: {
      type: "select",
      options: iconOptions,
    },
    mode: {
      ai: {
        instructions:
          "Use 'flat' for a transparent, center-aligned appearance or 'card' for an elevated, left-aligned appearance.",
        required: false,
      },
      type: "radio",
      options: [
        { label: "card", value: "card" },
        { label: "flat", value: "flat" },
      ],
    },
  },
  defaultProps: {
    title: "Title",
    description: "Description",
    icon: "feather",
    mode: "flat",
  },
  render: ({ title, icon, description, mode }) => {
    return (
      <div className={getClassName({ [mode]: mode })}>
        <div className={getClassName("inner")}>
          <div className={getClassName("icon")}>{icon && icons[icon]}</div>

          <div className={getClassName("title")}>{title}</div>
          <div className={getClassName("description")}>{description}</div>
        </div>
      </div>
    );
  },
};

export const Card = withLayout(CardInner);
