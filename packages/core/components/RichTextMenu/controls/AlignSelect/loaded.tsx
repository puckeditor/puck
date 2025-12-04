import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../../lib/use-control-context";
import { AlignLeft } from "lucide-react";
import { SelectControl } from "../../components/SelectControl";
import { useAlignOptions } from "./use-options";

type AlignDirection = "left" | "center" | "right" | "justify";

export function AlignSelectLoaded() {
  const { options } = useControlContext();

  const alignOptions = useAlignOptions(options);

  const { editor } = useControlContext();
  const currentValue: AlignDirection =
    useEditorState({
      editor,
      selector: (ctx) => {
        if (ctx.editor?.isActive({ textAlign: "center" })) {
          return "center";
        } else if (ctx.editor?.isActive({ textAlign: "right" })) {
          return "right";
        } else if (ctx.editor?.isActive({ textAlign: "justify" })) {
          return "justify";
        }

        return options?.textAlign
          ? (options.textAlign.defaultAlignment as AlignDirection) ?? "left"
          : "left";
      },
    }) ?? "left";

  const handleChange = (val: AlignDirection) => {
    const chain = editor?.chain();

    chain?.focus().setTextAlign(val).run();
  };

  return (
    <SelectControl<AlignDirection>
      options={alignOptions}
      onChange={handleChange}
      value={currentValue}
      defaultValue="left"
      renderDefaultIcon={AlignLeft}
    />
  );
}
