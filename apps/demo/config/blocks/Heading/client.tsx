import React from "react";
import { Sliders } from "lucide-react";

import { ComponentConfig } from "@/core/types";
import { FieldGroup } from "@/core";
import { Heading as HeadingServer, HeadingProps } from "./server";

// The fields layout is editor-only and uses client components, so it stays out of the server config
export const Heading: ComponentConfig<HeadingProps> = {
  ...HeadingServer,
  renderFields: ({ fields }) => (
    <>
      {fields.text}
      {fields.level}
      <FieldGroup icon={<Sliders size={16} />} label="Appearance">
        {fields.size}
        {fields.align}
      </FieldGroup>
      {fields.layout}
    </>
  ),
};
