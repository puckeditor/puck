import { Type } from "lucide-react";
import { FieldPropsInternal } from "../..";
import { Editor } from "../../../RichTextEditor";
import { RichtextField as RichtextFieldType } from "../../../../types";

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
  const { menu, controls, extensions, textSelectOptions, selector } =
    field as RichtextFieldType;
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
          readOnly={readOnly}
          extensions={extensions}
          menu={menu}
          textSelectOptions={textSelectOptions}
          selector={selector}
          controls={controls}
          id={id}
        />
      </Label>
    </>
  );
};
