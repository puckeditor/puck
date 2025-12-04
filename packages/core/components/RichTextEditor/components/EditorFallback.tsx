/** Fallback component. Should not contain any tiptap imports (except for types) */

import { memo } from "react";
import { EditorProps } from "../types";
import { LoadedRichTextMenuInner } from "../../RichTextMenu/inner";
import { EditorInner } from "./EditorInner";

export const EditorFallback = memo((props: EditorProps) => {
  return (
    <EditorInner
      {...props}
      editor={null}
      menu={
        <LoadedRichTextMenuInner
          field={props.field}
          editor={null}
          editorState={null}
          readOnly={props.readOnly ?? false}
        />
      }
    >
      <div
        className="rich-text"
        dangerouslySetInnerHTML={{ __html: props.content }}
        contentEditable
      />
    </EditorInner>
  );
});

EditorFallback.displayName = "EditorFallback";
