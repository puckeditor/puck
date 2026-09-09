"use client";

import type { Data } from "@puckeditor/core";
import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";

import config from "../../../puck.config";

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

export function Client({ path, data }: { path: string; data: Data }) {
  const configWithDesignedComponents = withDynamicConfig(config, data);

  return (
    <Puck
      plugins={plugins}
      data={data}
      config={configWithDesignedComponents}
      onPublish={async (data) => {
        await fetch("/api/pages", {
          method: "post",
          body: JSON.stringify({ data, path }),
        });
      }}
    />
  );
}
