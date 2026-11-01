"use client";

import type { ReactElement, ReactNode } from "react";
import { FieldTab } from "@/core";

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
    <FieldTab label="General">{Object.values(fieldsNoLayout)}</FieldTab>
  );

  // Add the layout tab if it wasn't hidden
  return (
    <>
      {otherFields}
      {layout && <FieldTab label="Layout">{layout}</FieldTab>}
    </>
  );
};

export default LayoutFields;
