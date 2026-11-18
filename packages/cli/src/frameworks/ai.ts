/** Shown when an existing editor can't be upgraded automatically */
export const AI_SNIPPET = `import { Puck } from "@puckeditor/core";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";

const aiPlugin = createAiPlugin({
  designMode: { visible: true },
  defaultMode: "design",
});

const plugins = [aiPlugin];

// In your editor component:
<Puck
  plugins={plugins}
  config={withDynamicConfig(config, data)}
  data={data}
  onPublish={onPublish}
/>
`;

export const RENDER_AI_SNIPPET = `import { withDynamicConfig } from "@puckeditor/plugin-ai";

<Render config={withDynamicConfig(config, data)} data={data} />
`;
