import { lazy, Suspense } from "react";
import { EditorState, RichTextEditor } from "../RichTextEditor/types";
import { RichtextField } from "../../types";
import { LoadedRichTextMenuInner } from "./inner";

const LoadedRichTextMenuFull = lazy(() =>
  import("./full").then((m) => ({
    default: m.LoadedRichTextMenuFull,
  }))
);

export type LoadedRichTextMenuProps = {
  field: RichtextField;
  editor: RichTextEditor | null;
  editorState?: EditorState | null;
  readOnly: boolean;
  inline?: boolean;
};
export const LoadedRichTextMenu = (props: LoadedRichTextMenuProps) => {
  return (
    <Suspense fallback={<LoadedRichTextMenuInner {...props} />}>
      <LoadedRichTextMenuFull {...props} />
    </Suspense>
  );
};
