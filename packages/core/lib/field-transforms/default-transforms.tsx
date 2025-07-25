import { ReactNode } from "react";
import { DropZoneProps } from "../../components/DropZone/types";
import { Content } from "../../types";
import { InlineTextField } from "../../components/InlineTextField";
import { FieldTransforms } from "../../types/API/FieldTransforms";

export const getSlotTransform = (
  renderSlotEdit: (dzProps: DropZoneProps & { content: Content }) => ReactNode,
  renderSlotRender: (
    dzProps: DropZoneProps & { content: Content }
  ) => ReactNode = renderSlotEdit
): FieldTransforms => ({
  slot: ({ value: content, propName, field, isReadOnly }) => {
    const render = isReadOnly ? renderSlotRender : renderSlotEdit;

    const Slot = (dzProps: DropZoneProps) =>
      render({
        allow: field?.type === "slot" ? field.allow : [],
        disallow: field?.type === "slot" ? field.disallow : [],
        ...dzProps,
        zone: propName,
        content,
      });

    return Slot;
  },
});

export const getInlineTextTransform = (): FieldTransforms => ({
  text: ({ value, componentId, field, propPath, isReadOnly }) => {
    if (field.contentEditable) {
      return (
        <InlineTextField
          propPath={propPath}
          componentId={componentId}
          value={value}
          opts={{ disableLineBreaks: true }}
          isReadOnly={isReadOnly}
        />
      );
    }

    return value;
  },
  textarea: ({ value, componentId, field, propPath, isReadOnly }) => {
    if (field.contentEditable) {
      return (
        <InlineTextField
          propPath={propPath}
          componentId={componentId}
          value={value}
          isReadOnly={isReadOnly}
        />
      );
    }

    return value;
  },
  custom: ({ value, componentId, field, propPath, isReadOnly }) => {
    if (field.contentEditable && typeof value === "string") {
      return (
        <InlineTextField
          propPath={propPath}
          componentId={componentId}
          value={value}
          isReadOnly={isReadOnly}
        />
      );
    }

    return value;
  },
});
