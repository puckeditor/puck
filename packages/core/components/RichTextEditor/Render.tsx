import {
  Extensions,
  generateHTML,
  generateJSON,
  JSONContent,
} from "@tiptap/react";
import { useMemo } from "react";

import getClassNameFactory from "../../lib/get-class-name-factory";
import { defaultExtensions } from "./extensions";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export function Render({
  content,
  extensions = [],
}: {
  content: string | JSONContent;
  extensions?: Extensions;
}) {
  const loadedExtensions = useMemo<Extensions>(
    () => [...defaultExtensions, ...extensions],
    [extensions]
  );

  const normalizedContent = useMemo(() => {
    if (
      typeof content === "object" &&
      content !== null &&
      "type" in content &&
      content.type === "doc"
    ) {
      return content as JSONContent;
    }

    if (typeof content === "string") {
      if (/<\/?[a-z][\s\S]*>/i.test(content)) {
        return generateJSON(content, loadedExtensions);
      }

      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: content }] },
        ],
      } as JSONContent;
    }

    return { type: "doc", content: [] } as JSONContent;
  }, [content, loadedExtensions]);

  const html = useMemo(
    () => generateHTML(normalizedContent, loadedExtensions),
    [normalizedContent, loadedExtensions]
  );

  return (
    <div
      className={getClassName()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
