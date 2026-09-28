import React from "react";

import { ComponentConfig } from "@/core";
import { spacingOptions } from "../../options";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Space", styles);

export type SpaceProps = {
  direction?: "" | "vertical" | "horizontal";
  size: string;
};

export const Space: ComponentConfig<SpaceProps> = {
  ai: {
    instructions:
      "Adds separation between adjacent components in the page's top-level `content` array. Inside Flex or Grid, use the container's gap instead.",
  },
  label: "Space",
  fields: {
    size: {
      type: "select",
      options: spacingOptions,
      ai: {
        instructions:
          "Use 8px to 16px between a heading and text, 24px to 96px between related content, and 96px to 120px between sections.",
      },
    },
    direction: {
      type: "radio",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
        { value: "", label: "Both" },
      ],
      ai: {
        instructions:
          "Use 'vertical' in a column or between top-level page components, 'horizontal' in a row, or the empty value when both axes need spacing.",
      },
    },
  },
  defaultProps: {
    direction: "",
    size: "24px",
  },
  inline: true,
  render: ({ direction, size, puck }) => {
    return (
      <div
        ref={puck.dragRef}
        className={getClassName(direction ? { [direction]: direction } : {})}
        style={{ "--size": size } as any}
      />
    );
  },
};
