import React from "react";

import { ComponentConfig } from "@/core";
import { spacingOptions } from "../../options";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Space", styles);

type Direction = "vertical" | "horizontal";

export type SpaceProps = {
  direction?: Direction[];
  size: string;
};

export const Space: ComponentConfig<SpaceProps> = {
  label: "Space",
  fields: {
    size: {
      type: "select",
      options: spacingOptions,
    },
    direction: {
      type: "checkbox",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
      ],
    },
  },
  defaultProps: {
    direction: ["vertical", "horizontal"],
    size: "24px",
  },
  inline: true,
  render: ({ direction, size, puck }) => {
    // Support legacy string values from before direction was a checkbox
    const directions: Direction[] =
      typeof direction === "string"
        ? [direction as Direction].filter(Boolean)
        : direction ?? [];

    // A single direction applies a modifier; both (or none) is a square
    const modifier = directions.length === 1 ? directions[0] : null;

    return (
      <div
        ref={puck.dragRef}
        className={getClassName(modifier ? { [modifier]: true } : {})}
        style={{ "--size": size } as any}
      />
    );
  },
};
