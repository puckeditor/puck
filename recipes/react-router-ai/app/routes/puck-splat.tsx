import { useMemo } from "react";
import { useFetcher, useLoaderData } from "react-router";
import type { Data } from "@puckeditor/core";
import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";

import type { Route } from "./+types/puck-splat";
import { config } from "../../puck.config";
import type { UserData } from "../../puck.config";
import { resolvePuckPath } from "~/lib/resolve-puck-path.server";
import { getPage, savePage } from "~/lib/pages.server";
import { PuckRender } from "~/components/puck-render";

import editorStyles from "@puckeditor/core/puck.css?url";
import pluginStyles from "@puckeditor/plugin-ai/styles.css?url";

export async function loader({ params }: Route.LoaderArgs) {
  const pathname = params["*"] ?? "/";
  const { isEditorRoute, path } = resolvePuckPath(pathname);
  let page = await getPage(path);

  // Throw a 404 if we're not rendering the editor and data for the page does not exist
  if (!isEditorRoute && !page) {
    throw new Response("Not Found", { status: 404 });
  }

  // Empty shell for new pages
  if (isEditorRoute && !page) {
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
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.isEditorRoute
        ? `Edit: ${loaderData.path}`
        : loaderData.data.root.props?.title ?? "",
    },
  ];
}

export async function action({ params, request }: Route.ActionArgs) {
  const pathname = params["*"] ?? "/";
  const { path } = resolvePuckPath(pathname);
  const body = (await request.json()) as { data: Data };

  await savePage(path, body.data);
}

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

function Editor() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const configWithDesignedComponents = useMemo(
    () => withDynamicConfig(config, loaderData.data),
    [config, loaderData.data]
  );

  return (
    <>
      <link rel="stylesheet" href={editorStyles} id="puck-css" />
      <link rel="stylesheet" href={pluginStyles} id="puck-plugin-ai-css" />
      <Puck
        plugins={plugins}
        config={configWithDesignedComponents}
        data={loaderData.data}
        onPublish={async (data) => {
          await fetcher.submit(
            { data: data as UserData },
            {
              action: "",
              method: "post",
              encType: "application/json",
            }
          );
        }}
      />
    </>
  );
}

export default function PuckSplatRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      {loaderData.isEditorRoute ? (
        <Editor />
      ) : (
        <PuckRender data={loaderData.data} />
      )}
    </div>
  );
}
