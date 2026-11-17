import React from "react";

import { ComponentConfig } from "@/core";
import { spacingOptions } from "../../options";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";
import { FieldTabs } from "../../components/FieldTabs";

const getClassName = getClassNameFactory("Space", styles);

type Direction = "vertical" | "horizontal";

export type SpaceProps = {
  directions?: Direction[];
  size: string;
};

export const Space: ComponentConfig<SpaceProps> = {
  ai: {
    instructions:
      "Adds empty space between components. Don't use this unless asked by the user explicitly. Inside Flex or Grid, use the container's gap instead of a Space.",
  },
  label: "Space",
  fields: {
    size: {
      type: "select",
      label: "Size",
      options: spacingOptions,
    },
    directions: {
      type: "checkbox",
      label: "Directions",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
      ],
      ai: {
        instructions:
          "Use 'vertical' in a column, 'horizontal' in a row, or the empty value when both axes need spacing.",
      },
    },
  },
  renderFields: ({ fields }) => (
    <FieldTabs appearance={[fields.size, fields.directions]} />
  ),
  defaultProps: {
    directions: ["vertical", "horizontal"],
    size: "24px",
  },
  inline: true,
  render: ({ directions, size, puck }) => {
    const modifier = directions?.length === 1 ? directions[0] : null;

    return (
      <div
        ref={puck.dragRef}
        className={getClassName(modifier ? { [modifier]: true } : {})}
        style={{ "--size": size } as any}
      />
    );
  },
};
