import { lazy, Suspense } from "react";
import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { RichtextField as RichtextFieldType } from "../../../../types";
import { EditorFallback } from "../../../RichTextEditor/components/EditorFallback";
import { useDeepField } from "../../lib/use-deep-field";

const Editor = lazy(() =>
  import("../../../RichTextEditor/components/Editor").then((m) => ({
    default: m.Editor,
  }))
);

export const RichtextField = ({
  onChange,
  readOnly = false,
  id,
  name = id,
  label,
  labelIcon,
  Label,
  field,
}: FieldPropsInternal) => {
  const content = useDeepField(name);

  const editorProps = {
    onChange: onChange,
    content,
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
