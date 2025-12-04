import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../lib/use-control-context";
import { useMemo } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { SelectControl } from "../components/SelectControl";

type AlignDirection = "left" | "center" | "right" | "justify";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  left: { label: "Left", icon: AlignLeft },
  center: { label: "Center", icon: AlignCenter },
  right: { label: "Right", icon: AlignRight },
  justify: { label: "Justify", icon: AlignJustify },
};

export function AlignSelect() {
  const { options } = useControlContext();

  let blockOptions: AlignDirection[] = [];

  if (options?.textAlign !== false) {
    if (!options?.textAlign?.alignments) {
      blockOptions = ["left", "center", "right", "justify"];
    } else {
      if (options?.textAlign.alignments.includes("left")) {
        blockOptions.push("left");
      }

      if (options?.textAlign.alignments.includes("center")) {
        blockOptions.push("center");
      }

      if (options?.textAlign.alignments.includes("right")) {
        blockOptions.push("right");
      }

      if (options?.textAlign.alignments.includes("justify")) {
        blockOptions.push("justify");
      }
    }
  }

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
    <SelectControl<AlignDirection>
      options={loadedOptions}
      onChange={handleChange}
      value={currentValue}
      defaultValue="left"
      renderDefaultIcon={AlignLeft}
    />
  );
}
