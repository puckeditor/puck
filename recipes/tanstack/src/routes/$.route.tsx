import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPageServerFn, savePageServerFn } from "@/data/page";
import { Puck, Render } from "@puckeditor/core";
import { resolvePuckPath } from "@/lib";
import { useServerFn } from "@tanstack/react-start";
import config from "@/puck.config";
import editorStyles from "@puckeditor/core/puck.css?url";

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
      ? [{ rel: "stylesheet", href: editorStyles }]
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

function Editor() {
  const loaderData = Route.useLoaderData();
  const savePage = useServerFn(savePageServerFn);
  return (
    <Puck
      config={config}
      data={loaderData.data || {}}
      onPublish={async (data) => {
        await savePage({ data: { data, path: loaderData.path } });
      }}
    />
  );
}

function Page() {
  const loaderData = Route.useLoaderData();

  return loaderData.isEditorRoute ? (
    <Editor />
  ) : (
    <Render config={config} data={loaderData?.data || {}} />
  );
}
