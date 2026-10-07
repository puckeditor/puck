import React from "react";
import { Sliders } from "lucide-react";

import { ComponentConfig } from "@/core/types";
import { FieldGroup, Tab } from "@/core";
import { Heading as HeadingServer, HeadingProps } from "./server";

// The fields layout is editor-only and uses client components, so it stays out of the server config
export const Heading: ComponentConfig<HeadingProps> = {
  ...HeadingServer,
  renderFields: ({ fields }) => {
    return (
      <>
        <Tab label="Content">
          {fields.text}
          {fields.level}
        </Tab>
        <Tab label="Design">
          <FieldGroup icon={<Sliders size={16} />} label="Appearance">
            {fields.size}
            {fields.align}
          </FieldGroup>
          {fields.layout}
        </Tab>
      </>
    );
  },
};
