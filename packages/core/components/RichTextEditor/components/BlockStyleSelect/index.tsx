import { useEditorState, Editor as EditorType } from "@tiptap/react";

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
import { Select } from "../../../Select";
import { RichTextElement } from "../../../../types";

const optionNodes: Record<string, { label: string; icon?: React.FC }> = {
  h1: { label: "Heading 1", icon: Heading1 },
  h2: { label: "Heading 2", icon: Heading2 },
  h3: { label: "Heading 3", icon: Heading3 },
  h4: { label: "Heading 4", icon: Heading4 },
  h5: { label: "Heading 5", icon: Heading5 },
  h6: { label: "Heading 6", icon: Heading6 },
};

export const BlockStyleSelect = ({
  config,
  editor,
}: {
  config: RichTextElement[];
  editor: EditorType;
}) => {
  const currentValue = useEditorState({
    editor,
    selector: (ctx) => {
      if (ctx.editor.isActive("paragraph")) return "p";
      for (let level = 1; level <= 6; level++) {
        if (ctx.editor.isActive("heading", { level })) {
          return `h${level}` as RichTextElement;
        }
      }
      return "p";
    },
  });

  const handleChange = (val: RichTextElement | "p") => {
    const chain = editor.chain();

    if (val === "p") {
      chain.focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace("h", ""), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      chain.focus().toggleHeading({ level }).run();
    }
  };

  const options = useMemo(
    () =>
      config.map((item) => ({
        value: item,
        label: optionNodes[item].label,
        icon: optionNodes[item].icon,
      })),
    [config]
  );

  const Node = (currentValue && optionNodes[currentValue]?.icon) ?? Heading;

  return (
    <Select
      options={options}
      onChange={handleChange}
      value={currentValue}
      defaultValue="p"
    >
      <Node size="20" />
    </Select>
  );
};
