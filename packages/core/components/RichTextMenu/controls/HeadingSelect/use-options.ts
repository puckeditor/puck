import { useMemo } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from "lucide-react";
import { RichtextField } from "../../../../types";
import { useMessage } from "../../../../lib/use-message";

const optionIcons: Record<string, React.FC | undefined> = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
};

export type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export const useHeadingOptions = (fieldOptions: RichtextField["options"]) => {
  const h1String = useMessage("field-richtext-headingselect-1");
  const h2String = useMessage("field-richtext-headingselect-2");
  const h3String = useMessage("field-richtext-headingselect-3");
  const h4String = useMessage("field-richtext-headingselect-4");
  const h5String = useMessage("field-richtext-headingselect-5");
  const h6String = useMessage("field-richtext-headingselect-6");

  const optionLabels: Record<HeadingElement, string> = {
    h1: h1String,
    h2: h2String,
    h3: h3String,
    h4: h4String,
    h5: h5String,
    h6: h6String,
  };

  let blockOptions: HeadingElement[] = [];

  if (fieldOptions?.heading !== false) {
    if (!fieldOptions?.heading?.levels) {
      blockOptions = ["h1", "h2", "h3", "h4", "h5", "h6"];
    } else {
      if (fieldOptions?.heading.levels.includes(1)) {
        blockOptions.push("h1");
      }

      if (fieldOptions?.heading.levels.includes(2)) {
        blockOptions.push("h2");
      }

      if (fieldOptions?.heading.levels.includes(3)) {
        blockOptions.push("h3");
      }

      if (fieldOptions?.heading.levels.includes(4)) {
        blockOptions.push("h4");
      }

      if (fieldOptions?.heading.levels.includes(5)) {
        blockOptions.push("h5");
      }

      if (fieldOptions?.heading.levels.includes(6)) {
        blockOptions.push("h6");
      }
    }
  }

  return useMemo(
    () =>
      blockOptions.map((item) => ({
        value: item,
        label: optionLabels[item],
        icon: optionIcons[item],
      })),
    [blockOptions, optionLabels]
  );
};
