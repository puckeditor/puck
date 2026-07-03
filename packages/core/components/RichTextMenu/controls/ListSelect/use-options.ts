import { useMemo } from "react";
import { List, ListOrdered } from "lucide-react";
import { RichtextField } from "../../../../types";
import { useMessage } from "../../../../lib/use-message";

const optionIcons: Record<string, React.FC | undefined> = {
  ul: List,
  ol: ListOrdered,
};

export type ListElement = "ol" | "ul";

export const useListOptions = (fieldOptions: RichtextField["options"]) => {
  const ulString = useMessage("field-richtext-listselect-bullet");
  const olString = useMessage("field-richtext-listselect-ordered");

  const optionLabels: Record<ListElement, string> = {
    ul: ulString,
    ol: olString,
  };

  let blockOptions: ListElement[] = [];

  if (fieldOptions?.listItem !== false) {
    blockOptions = ["ul", "ol"];
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
