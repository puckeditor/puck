"use client";

import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";
import { createAiPlugin } from "@puckeditor/plugin-ai";

import config from "../../../puck.config";

const aiPlugin = createAiPlugin({
  // Allow users to switch between design and assembly mode.
  // Read more: https://puckeditor.com/docs/ai/design-mode
  designMode: {
    visible: true,
  },
});

export function Client({ path, data }: { path: string; data: Partial<Data> }) {
  return (
    <Puck
      plugins={[aiPlugin]}
      config={config}
      data={data}
      onPublish={async (data) => {
        await fetch("/api/pages", {
          method: "post",
          body: JSON.stringify({ data, path }),
        });
      }}
    />
  );
}
