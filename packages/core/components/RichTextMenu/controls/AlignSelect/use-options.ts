import { useMemo } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { RichtextField } from "../../../../types";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  left: { label: "Left", icon: AlignLeft },
  center: { label: "Center", icon: AlignCenter },
  right: { label: "Right", icon: AlignRight },
  justify: { label: "Justify", icon: AlignJustify },
};

export type AlignDirection = "left" | "center" | "right" | "justify";

export const useAlignOptions = (fieldOptions: RichtextField["options"]) => {
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
        label: optionNodes[item].label,
        icon: optionNodes[item].icon,
      })),
    [blockOptions]
  );
};
