/** Fallback component. Should not contain any tiptap imports (except for types) */

import getClassNameFactory from "../../../lib/get-class-name-factory";
import styles from "../styles.module.css";

const getClassName = getClassNameFactory("RichTextEditor", styles);

export function RichTextRenderFallback({ content }: { content: string }) {
  return (
    <div className={getClassName()}>
      <div
        className="rich-text"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
