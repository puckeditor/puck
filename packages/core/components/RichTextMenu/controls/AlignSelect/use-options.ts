import { useMemo } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { RichtextField } from "../../../../types";
import { useMessage } from "../../../../lib/use-message";

const optionIcons: Record<string, React.FC | undefined> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

export type AlignDirection = "left" | "center" | "right" | "justify";

export const useAlignOptions = (fieldOptions: RichtextField["options"]) => {
  const leftString = useMessage("field-richtext-alignselect-left");
  const centerString = useMessage("field-richtext-alignselect-center");
  const rightString = useMessage("field-richtext-alignselect-right");
  const justifyString = useMessage("field-richtext-alignselect-justify");

  const optionLabels: Record<AlignDirection, string> = {
    left: leftString,
    center: centerString,
    right: rightString,
    justify: justifyString,
  };

  let blockOptions: AlignDirection[] = [];

  if (fieldOptions?.textAlign !== false) {
    if (!fieldOptions?.textAlign?.alignments) {
      blockOptions = ["left", "center", "right", "justify"];
    } else {
      if (fieldOptions?.textAlign.alignments.includes("left")) {
        blockOptions.push("left");
      }

      if (fieldOptions?.textAlign.alignments.includes("center")) {
        blockOptions.push("center");
      }

      if (fieldOptions?.textAlign.alignments.includes("right")) {
        blockOptions.push("right");
      }

      if (fieldOptions?.textAlign.alignments.includes("justify")) {
        blockOptions.push("justify");
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
