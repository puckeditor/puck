import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../../lib/use-control-context";
import { SelectControl } from "../../components/SelectControl";
import { List } from "lucide-react";
import { ListElement, useListOptions } from "./use-options";

export function ListSelectLoaded() {
  const { options } = useControlContext();
  const listOptions = useListOptions(options);

  const { editor } = useControlContext();
  const currentValue = useEditorState({
    editor,
    selector: (ctx) => {
      if (ctx.editor?.isActive("bulletList")) return "ul";
      if (ctx.editor?.isActive("orderedList")) return "ol";

      return "p";
    },
  });

  const handleChange = (val: ListElement | "p") => {
    const chain = editor?.chain();

    if (val === "p") {
      chain?.focus().setParagraph().run();
    } else if (val === "ol") {
      chain?.focus().toggleOrderedList().run();
    } else if (val === "ul") {
      chain?.focus().toggleBulletList().run();
    }
  };

  return (
    <SelectControl<ListElement | "p">
      options={listOptions}
      onChange={handleChange}
      value={currentValue ?? "p"}
      defaultValue="p"
      renderDefaultIcon={List}
    />
  );
}
