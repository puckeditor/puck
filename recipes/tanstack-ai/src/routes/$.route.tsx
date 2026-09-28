import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPageServerFn, savePageServerFn } from "@/data/page";
import { useMemo } from "react";
import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { resolvePuckPath } from "@/lib";
import { useServerFn } from "@tanstack/react-start";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";
import config from "@/puck.config";
import type { UserData } from "@/puck.config";
import { PuckRender } from "@/components/puck-render";
import editorStyles from "@puckeditor/core/puck.css?url";
import pluginStyles from "@puckeditor/plugin-ai/styles.css?url";

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const pathname = `/${params._splat ?? ""}`;
    const { isEditorRoute, path } = resolvePuckPath(pathname);
    let page = await getPageServerFn({ data: path });

    if (!page) {
      if (!isEditorRoute) throw notFound();

      // Empty shell for new pages
      page = {
        content: [],
        root: {
          props: {
            title: "",
          },
        },
      };
    }
    return {
      isEditorRoute,
      path,
      data: page,
    };
  },
  head: ({ loaderData }) => ({
    links: loaderData?.isEditorRoute
      ? [
          { rel: "stylesheet", href: editorStyles },
          { rel: "stylesheet", href: pluginStyles },
        ]
      : [],
    meta: [
      {
        title: loaderData?.isEditorRoute
          ? "Edit: " + loaderData.path
          : loaderData?.data?.root?.props?.title ?? "",
      },
    ],
  }),
  component: Page,
  notFoundComponent: () => <p>Not Found</p>,
  pendingComponent: () => <p>Loading...</p>,
});

const aiPlugin = createAiPlugin({
  // Allow users to switch between design and assembly mode.
  // Read more: https://puckeditor.com/docs/ai/design-mode
  designMode: {
    visible: true,
  },
  defaultMode: "design",
});

const plugins = [aiPlugin, blocksPlugin(), outlinePlugin()];

function Editor() {
  const loaderData = Route.useLoaderData();
  const savePage = useServerFn(savePageServerFn);
  const configWithDesignedComponents = useMemo(
    () =>
      withDynamicConfig(config, loaderData.data || { content: [], root: {} }),
    [loaderData.data]
  );
  return (
    <Puck
      config={configWithDesignedComponents}
      plugins={plugins}
      data={loaderData.data || {}}
      onPublish={async (data) => {
        await savePage({
          data: { data: data as UserData, path: loaderData.path },
        });
      }}
    />
  );
}

function Page() {
  const loaderData = Route.useLoaderData();

  return loaderData.isEditorRoute ? (
    <Editor />
  ) : (
    <PuckRender data={loaderData.data || { content: [], root: {} }} />
  );
}
