import { useEditorState } from "@tiptap/react";
import { useControlContext } from "../../lib/use-control-context";
import { Heading } from "lucide-react";
import { SelectControl } from "../../components/SelectControl";
import { HeadingElement, useHeadingOptions } from "./use-options";

export function HeadingSelectLoaded() {
  const { options } = useControlContext();
  const headingOptions = useHeadingOptions(options);

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

  return (
    <SelectControl<HeadingElement | "p">
      options={headingOptions}
      onChange={handleChange}
      value={currentValue ?? "p"}
      defaultValue="p"
      renderDefaultIcon={Heading}
    />
  );
}
