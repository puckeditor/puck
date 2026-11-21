"use client";

import { Children, ReactNode } from "react";
import { FieldGroup, FieldTab } from "@/core";

const hasFields = (fields: ReactNode) => Children.toArray(fields).length > 0;

/**
 * Renders a component's fields in the tabs shared by every component. Tabs
 * without visible fields are left out.
 */
export const FieldTabs = ({
  content,
  data,
  appearance,
  backgroundGroup,
  layoutGroup,
}: {
  /** Fields for what the component shows, such as its text, media and items. */
  content?: ReactNode;
  /** Fields that load the component's content from an external source. */
  data?: ReactNode;
  /** Fields for how the component looks and is laid out. */
  appearance?: ReactNode;
  /** Fields for the component's background, in a Background group under Appearance. */
  backgroundGroup?: ReactNode;
  /** Fields for the component's spacing, in a Layout group under Appearance. */
  layoutGroup?: ReactNode;
}) => (
  <>
    {hasFields(content) && <FieldTab label="Content">{content}</FieldTab>}
    {hasFields(data) && <FieldTab label="Data">{data}</FieldTab>}
    {(hasFields(appearance) ||
      hasFields(backgroundGroup) ||
      hasFields(layoutGroup)) && (
      <FieldTab label="Appearance">
        {appearance}
        {hasFields(backgroundGroup) && (
          <FieldGroup label="Background" defaultExpanded>
            {backgroundGroup}
          </FieldGroup>
        )}
        {hasFields(layoutGroup) && (
          <FieldGroup label="Layout" defaultExpanded>
            {layoutGroup}
          </FieldGroup>
        )}
      </FieldTab>
    )}
  </>
);
