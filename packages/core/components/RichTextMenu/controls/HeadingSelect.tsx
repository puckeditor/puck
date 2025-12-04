import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../lib/use-control-context";
import { useMemo } from "react";
import {
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from "lucide-react";
import { SelectControl } from "../components/SelectControl";

type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  h1: { label: "Heading 1", icon: Heading1 },
  h2: { label: "Heading 2", icon: Heading2 },
  h3: { label: "Heading 3", icon: Heading3 },
  h4: { label: "Heading 4", icon: Heading4 },
  h5: { label: "Heading 5", icon: Heading5 },
  h6: { label: "Heading 6", icon: Heading6 },
};

export function HeadingSelect() {
  const { options } = useControlContext();

  let blockOptions: HeadingElement[] = [];

  if (options?.heading !== false) {
    if (!options?.heading?.levels) {
      blockOptions = ["h1", "h2", "h3", "h4", "h5", "h6"];
    } else {
      if (options?.heading.levels.includes(1)) {
        blockOptions.push("h1");
      }

      if (options?.heading.levels.includes(2)) {
        blockOptions.push("h2");
      }

      if (options?.heading.levels.includes(3)) {
        blockOptions.push("h3");
      }

      if (options?.heading.levels.includes(4)) {
        blockOptions.push("h4");
      }

      if (options?.heading.levels.includes(5)) {
        blockOptions.push("h5");
      }

      if (options?.heading.levels.includes(6)) {
        blockOptions.push("h6");
      }
    }
  }

  const { editor } = useControlContext();
  const currentValue = useEditorState({
    editor,
    selector: (ctx) => {
      if (ctx.editor?.isActive("paragraph")) return "p";
      for (let level = 1; level <= 6; level++) {
        if (ctx.editor?.isActive("heading", { level })) {
          return `h${level}` as HeadingElement;
        }
      }
      return "p";
    },
  });

  const handleChange = (val: HeadingElement | "p") => {
    const chain = editor?.chain();

    if (val === "p") {
      chain?.focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace("h", ""), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      chain?.focus().toggleHeading({ level }).run();
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
    <SelectControl<HeadingElement | "p">
      options={loadedOptions}
      onChange={handleChange}
      value={currentValue ?? "p"}
      defaultValue="p"
      renderDefaultIcon={Heading}
    />
  );
}
