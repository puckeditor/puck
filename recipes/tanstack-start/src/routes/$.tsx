import { createFileRoute } from "@tanstack/react-router";
import { Puck } from "@puckeditor/core";

import { config } from "../../puck.config";
import { loadPuckPage, publishPuckPage } from "../lib/pages";
import { PuckRender } from "../components/puck-render";

import editorStyles from "@puckeditor/core/puck.css?url";

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
      ? [{ rel: "stylesheet", href: editorStyles }]
      : [],
  }),
  component: PuckSplatRoute,
});

function PuckSplatRoute() {
  const { isEditorRoute, path, data } = Route.useLoaderData();

  return isEditorRoute ? (
    <Puck
      config={config}
      data={data}
      onPublish={async (data) => {
        await publishPuckPage({ data: { path, data } });
      }}
    />
  ) : (
    <PuckRender data={data} />
  );
}
