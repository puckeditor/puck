import { InlineTextField } from "../../../components/InlineTextField";
import { FieldTransforms } from "../../../types/API/FieldTransforms";

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
