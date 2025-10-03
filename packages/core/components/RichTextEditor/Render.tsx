import { generateHTML, JSONContent } from "@tiptap/react";
import { defaultExtensions } from "./extensions";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export function Render({ content }: { content: string | JSONContent }) {
  let html: string;

  if (typeof content === "string") {
    // fallback: assume HTML
    html = content;
  } else {
    // assume JSON
    html = generateHTML(content, defaultExtensions);
  }

  return (
    <div
      className={getClassName({ render: true })}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
