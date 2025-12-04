import { lazy, Suspense } from "react";
import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { RichtextField as RichtextFieldType } from "../../../../types";
import { EditorFallback } from "../../../RichTextEditor/components/EditorFallback";

const Editor = lazy(() =>
  import("../../../RichTextEditor/components/Editor").then((m) => ({
    default: m.Editor,
  }))
);

export const RichtextField = ({
  onChange,
  readOnly = false,
  value,
  name,
  label,
  labelIcon,
  Label,
  field,
  id,
}: FieldPropsInternal) => {
  const editorProps = {
    onChange: onChange,
    content: typeof value === "undefined" ? "" : value,
    readOnly: readOnly,
    field: field as RichtextFieldType,
    id: id,
    name: name,
  };

  return (
    <>
      <Label
        label={label || name}
        icon={labelIcon || <Type size={16} />}
        readOnly={readOnly}
        el="div"
      >
        <Suspense fallback={<EditorFallback {...editorProps} />}>
          <Editor {...editorProps} />
        </Suspense>
      </Label>
    </>
  );
};
