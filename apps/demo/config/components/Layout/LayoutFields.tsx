"use client";

import type { ReactElement, ReactNode } from "react";
import { Tab } from "@/core";

/**
 * Renders the augmented component fields with a layout tab for the "layout" field.
 */
const LayoutFields = ({
  fields,
  AugmentedRenderFields,
}: {
  fields: Partial<Record<string, ReactNode>>;
  AugmentedRenderFields?: ({
    fields,
  }: {
    fields: Partial<Record<string, ReactNode>>;
  }) => ReactElement;
}) => {
  const { layout, ...fieldsNoLayout } = fields;

  // Show the other fields in a tab if it doesn't define a custom fields layout
  const otherFields = AugmentedRenderFields ? (
    <AugmentedRenderFields fields={fieldsNoLayout} />
  ) : (
    <Tab label="General">{Object.values(fieldsNoLayout)}</Tab>
  );

  // Add the layout tab if it wasn't hidden
  return (
    <>
      {otherFields}
      {layout && <Tab label="Layout">{layout}</Tab>}
    </>
  );
};

export default LayoutFields;
