import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Data } from "@puckeditor/core";
import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";

import { config } from "../../puck.config";
import { loadPuckPage, publishPuckPage } from "../lib/pages";
import { PuckRender } from "../components/puck-render";

import editorStyles from "@puckeditor/core/puck.css?url";
import pluginStyles from "@puckeditor/plugin-ai/styles.css?url";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => loadPuckPage({ data: params._splat ?? "" }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.isEditorRoute
          ? `Edit: ${loaderData.path}`
          : loaderData?.data.root.props?.title ?? "",
      },
    ],
    links: loaderData?.isEditorRoute
      ? [
          { rel: "stylesheet", href: editorStyles },
          { rel: "stylesheet", href: pluginStyles },
        ]
      : [],
  }),
  component: PuckSplatRoute,
});

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

function Editor({ path, data }: { path: string; data: Data }) {
  const configWithDesignedComponents = useMemo(
    () => withDynamicConfig(config, data),
    [config, data]
  );

  return (
    <Puck
      plugins={plugins}
      config={configWithDesignedComponents}
      data={data}
      onPublish={async (data) => {
        await publishPuckPage({ data: { path, data } });
      }}
    />
  );
}

function PuckSplatRoute() {
  const { isEditorRoute, path, data } = Route.useLoaderData();

  return isEditorRoute ? (
    <Editor path={path} data={data} />
  ) : (
    <PuckRender data={data} />
  );
}
