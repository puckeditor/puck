/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core/types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "@/core/lib";
import { withLayout, WithLayout } from "../../components/Layout";
import { Icon, iconField } from "../../components/Icon";
import { FieldTabs } from "../../components/FieldTabs";

const getClassName = getClassNameFactory("Card", styles);

export type CardProps = WithLayout<{
  title: string;
  description: string;
  icon?: string;
  mode?: "flat" | "card";
}>;

const CardInner: ComponentConfig<CardProps> = {
  ai: {
    instructions: "Lists a feature or item. Use Cards inside a FeatureGrid.",
  },
  fields: {
    title: {
      type: "text",
      label: "Title",
      contentEditable: true,
      placeholder: "Enter a title",
    },
    description: {
      type: "textarea",
      label: "Description",
      contentEditable: true,
      placeholder: "Enter a description",
    },
    icon: iconField,
    mode: {
      ai: {
        instructions:
          "Optional. Use 'flat' for a transparent, center-aligned appearance or 'card' for an elevated, left-aligned appearance. Inside a Feature Grid, set this for all cards in the grid's cardMode.",
        required: false,
      },
      type: "radio",
      label: "Mode",
      options: [
        { label: "Card", value: "card" },
        { label: "Flat", value: "flat" },
      ],
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs
      content={[fields.title, fields.description, fields.icon]}
      appearance={[fields.mode, fields.layout]}
    />
  ),
  defaultProps: {
    title: "",
    description: "",
    icon: "feather",
    mode: "flat",
  },
  // Inside a Feature Grid, the grid sets the style of all its Cards, so the
  // Card hides its own mode field and takes the grid's style
  resolveFields: (_, { fields, parent }) => ({
    ...fields,
    mode: parent?.type === "FeatureGrid" ? undefined : fields.mode,
  }),
  resolveData: (data, { parent }) => {
    const gridMode =
      parent?.type === "FeatureGrid" ? parent.props.cardMode : undefined;

    const newProps = { ...data.props };

    if (gridMode) {
      newProps.mode = gridMode;
    }

    return { ...data, props: newProps };
  },
  render: ({ title, icon, description, mode = "flat" }) => {
    return (
      <div className={getClassName({ [mode]: mode })}>
        <div className={getClassName("inner")}>
          <div className={getClassName("icon")}>
            <Icon name={icon} />
          </div>

          <div className={getClassName("title")}>{title}</div>
          <div className={getClassName("description")}>{description}</div>
        </div>
      </div>
    );
  },
};

export const Card = withLayout(CardInner);
