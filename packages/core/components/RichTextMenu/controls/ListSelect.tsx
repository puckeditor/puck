import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../lib/use-control-context";
import { useMemo } from "react";
import { List, ListOrdered } from "lucide-react";
import { SelectControl } from "../components/SelectControl";

type ListElement = "ol" | "ul";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  ul: { label: "Bullet list", icon: List },
  ol: { label: "Numbered list", icon: ListOrdered },
};

export function ListSelect() {
  const { options } = useControlContext();

  let blockOptions: ListElement[] = [];

  if (options?.listItem !== false) {
    blockOptions = ["ul", "ol"];
  }

  const { editor } = useControlContext();
  const currentValue = useEditorState({
    editor,
    selector: (ctx) => {
      if (ctx.editor.isActive("bulletList")) return "ul";
      if (ctx.editor.isActive("orderedList")) return "ol";

      return "p";
    },
  });

  const handleChange = (val: ListElement | "p") => {
    const chain = editor.chain();

    if (val === "p") {
      chain.focus().setParagraph().run();
    } else if (val === "ol") {
      chain.focus().toggleOrderedList().run();
    } else if (val === "ul") {
      chain.focus().toggleBulletList().run();
    }
  };

  const loadedOptions = useMemo(
    () =>
      blockOptions.map((item) => ({
        value: item,
        label: optionNodes[item].label,
        icon: optionNodes[item].icon,
      })),
    [blockOptions]
  );

  return (
    <SelectControl<ListElement | "p">
      options={loadedOptions}
      onChange={handleChange}
      value={currentValue}
      defaultValue="p"
      renderDefaultIcon={List}
    />
  );
}
