/* eslint-disable @next/next/no-img-element */
import React, { ReactElement } from "react";
import { ComponentConfig } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import dynamic from "next/dynamic";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { withLayout, WithLayout } from "../../components/Layout";

const getClassName = getClassNameFactory("Card", styles);

const icons = Object.keys(dynamicIconImports).reduce<
  Record<string, ReactElement>
>((acc, iconName) => {
  const El = dynamic((dynamicIconImports as any)[iconName]);

  return {
    ...acc,
    [iconName]: <El />,
  };
}, {});

const iconOptions = Object.keys(dynamicIconImports).map((iconName) => ({
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
  label: "Card",
  fields: {
    title: {
      label: "Title",
      type: "text",
      contentEditable: true,
    },
    description: {
      label: "Description",
      type: "textarea",
      contentEditable: true,
    },
    icon: {
      label: "Icon",
      type: "select",
      options: iconOptions,
    },
    mode: {
      label: "Style",
      type: "radio",
      options: [
        { label: "Card", value: "card" },
        { label: "Flat", value: "flat" },
      ],
    },
  },
  defaultProps: {
    title: "Card Title",
    description: "Card description text goes here.",
    icon: "Feather",
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
