import { useMemo } from "react";
import { List, ListOrdered } from "lucide-react";
import { RichtextField } from "../../../../types";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  ul: { label: "Bullet list", icon: List },
  ol: { label: "Numbered list", icon: ListOrdered },
};

export type ListElement = "ol" | "ul";

export const useListOptions = (fieldOptions: RichtextField["options"]) => {
  let blockOptions: ListElement[] = [];

  if (fieldOptions?.listItem !== false) {
    blockOptions = ["ul", "ol"];
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
