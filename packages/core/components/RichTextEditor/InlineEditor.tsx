import { useMemo } from "react";
import { useSyncedEditor } from "./lib/use-synced-editor";
import { defaultExtensions } from "./extensions";
import { InlineMenu } from "./components/InlineMenu/InlineMenu";
import { EditorContent, Extensions } from "@tiptap/react";
import { defaultConfig } from "./config";
import { Loader } from "../Loader";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { EditorProps } from "./types";
const getClassName = getClassNameFactory("RichTextEditor", styles);

export const InlineEditor = ({
  onChange,
  content,
  configOverrides = {},
  extensionOverrides = [],
}: EditorProps) => {
  const config = useMemo(() => {
    return Object.keys(configOverrides).length > 0
      ? configOverrides
      : defaultConfig;
  }, [configOverrides]);

  const extensions = useMemo(
    () => [...defaultExtensions, ...extensionOverrides] as Extensions,
    [extensionOverrides]
  );

  const editor = useSyncedEditor<typeof extensions>({
    content,
    onChange,
    extensions,
    editable: true,
  });

  if (!editor) return <Loader />;

  return (
    <>
      <InlineMenu editor={editor} menuConfig={config.inlineMenu || {}} />
      <EditorContent
        editor={editor}
        className={getClassName({ inline: true })}
      />
    </>
  );
};
