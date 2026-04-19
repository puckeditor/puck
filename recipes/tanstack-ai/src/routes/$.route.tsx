import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPageServerFn, savePageServerFn } from "@/data/page";
import { Puck, Render } from "@puckeditor/core";
import { resolvePuckPath } from "@/lib";
import { useServerFn } from "@tanstack/react-start";
import { createAiPlugin } from "@puckeditor/plugin-ai";
import config from "@/puck.config";
import "@puckeditor/core/puck.css";
import "@puckeditor/plugin-ai/styles.css";

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const pathname = `/${params._splat ?? ""}`;
    const { isEditorRoute, path } = resolvePuckPath(pathname);
    let page = await getPageServerFn({ data: path });

    if (!isEditorRoute && !page) {
      throw notFound();
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
  },
  head: ({ params, loaderData }) => ({
    meta: [
      {
        title: loaderData?.isEditorRoute
          ? "Puck: " + params._splat
          : (loaderData?.data?.root?.props?.title ?? ""),
      },
    ],
  }),
  component: Page,
  notFoundComponent: () => <p>Not Found</p>,
  pendingComponent: () => <p>Loading...</p>,
});

const aiPlugin = createAiPlugin();

function Editor() {
  const loaderData = Route.useLoaderData();
  const savePage = useServerFn(savePageServerFn);
  return (
    <Puck
      config={config}
      plugins={[aiPlugin]}
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
