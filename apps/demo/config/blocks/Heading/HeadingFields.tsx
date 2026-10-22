"use client";

import React, { ReactNode } from "react";
import { Sliders } from "lucide-react";

import { FieldGroup, FieldTab } from "@/core";
import type { HeadingProps } from ".";

/**
 * Renders the fields layout for the Heading component
 */
export const HeadingFields = ({
  fields,
}: {
  fields: Partial<Record<keyof HeadingProps, ReactNode>>;
}) => (
  <FieldTab label="General">
    {fields.text}
    {fields.level}
    <FieldGroup icon={<Sliders size={16} />} label="Appearance">
      {fields.size}
      {fields.align}
    </FieldGroup>
  </FieldTab>
);
