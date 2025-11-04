import { useEditorState, Editor as EditorType } from "@tiptap/react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import { RichTextSelectOptions } from "../../types";

const getClassName = getClassNameFactory("BlockStyleSelect", styles);

export const BlockStyleSelect = ({
  config,
  editor,
}: {
  config: RichTextSelectOptions[];
  editor: EditorType;
}) => {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (ctx.editor.isActive("paragraph")) return "p";
      for (let level = 1; level <= 6; level++) {
        if (ctx.editor.isActive("heading", { level })) {
          return `h${level}` as RichTextSelectOptions;
        }
      }
      return "p";
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as RichTextSelectOptions;
    const chain = editor.chain();

    if (val === "p") {
      chain.focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace("h", ""), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      chain.focus().toggleHeading({ level }).run();
    }
  };

  if (!config || config.length === 0) return null;

  return (
    <select
      value={editorState}
      onChange={handleChange}
      className={getClassName("input")}
    >
      {config.map((option) => (
        <option key={option} value={option}>
          {option === "p" ? "Paragraph" : `Heading ${option.replace("h", "")}`}
        </option>
      ))}
    </select>
  );
};
