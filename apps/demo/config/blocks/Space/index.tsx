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
