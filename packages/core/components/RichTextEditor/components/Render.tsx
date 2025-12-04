import type { JSONContent } from "@tiptap/react";
import { generateHTML, generateJSON } from "@tiptap/html";
import { useMemo } from "react";
import getClassNameFactory from "../../../lib/get-class-name-factory";
import styles from "../styles.module.css";
import { PuckRichText } from "../extension";
import { RichtextField } from "../../../types";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export function RichTextRender({
  content,
  field,
}: {
  content: string | JSONContent;
  field: RichtextField;
}) {
  const { tiptap = {}, options } = field;
  const { extensions = [] } = tiptap;

  const loadedExtensions = useMemo(
    () => [PuckRichText.configure(options), ...extensions],
    [field, extensions]
  );

  const normalized: JSONContent = useMemo(() => {
    if (typeof content === "object" && content?.type === "doc") {
      return content;
    }

    if (typeof content === "string") {
      const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

      if (isHtml) {
        return generateJSON(content, loadedExtensions);
      }

      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: content }] },
        ],
      };
    }

    return { type: "doc", content: [] };
  }, [content, loadedExtensions]);

  const html = useMemo(() => {
    return generateHTML(normalized, loadedExtensions);
  }, [normalized, loadedExtensions]);

  return (
    <div className={getClassName()}>
      <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
