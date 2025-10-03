import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { Editor } from "../../../RichTextEditor";
import { RichtextField as RichtextFieldType } from "../../../../types";

export const RichtextField = ({
  onChange,
  readOnly,
  value,
  name,
  label,
  labelIcon,
  Label,
  field,
  id,
}: FieldPropsInternal) => {
  const { config, extensions } = field as RichtextFieldType;
  return (
    <>
      <Label
        label={label || name}
        icon={labelIcon || <Type size={16} />}
        readOnly={readOnly}
        el="div"
      >
        <Editor
          onChange={onChange}
          content={typeof value === "undefined" ? "" : value}
          readOnly={readOnly || false}
          configOverrides={config}
          extensionOverrides={extensions}
          id={id}
        />
      </Label>
    </>
  );
};
