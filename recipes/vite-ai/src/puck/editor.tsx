import { useEffect, useMemo, useState } from "react";
import type { Data } from "@puckeditor/core";
import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";
import "@puckeditor/core/puck.css";
import "@puckeditor/plugin-ai/styles.css";

import { config } from "../puck.config";
import { loadPage, savePage } from "./pages";

const aiPlugin = createAiPlugin({
  // Allow users to switch between design and assembly mode.
  // Read more: https://puckeditor.com/docs/ai/design-mode
  designMode: {
    visible: true,
  },
  // Select design mode by default.
  defaultMode: "design",
});

// Place the ai plugin in the first position in the side nav.
const plugins = [aiPlugin, blocksPlugin(), outlinePlugin()];

// Empty shell for new pages
const emptyPage: Data = { content: [], root: { props: { title: "" } } };

export default function Editor({ path }: { path: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    loadPage(path).then((page) => setData(page ?? emptyPage));
  }, [path]);

  const configWithDesignedComponents = useMemo(
    () => (data ? withDynamicConfig(config, data) : config),
    [data]
  );

  if (!data) return null;

  return (
    <Puck
      plugins={plugins}
      config={configWithDesignedComponents}
      data={data}
      onPublish={(data) => savePage(path, data)}
    />
  );
}
