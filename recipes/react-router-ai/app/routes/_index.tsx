import type { Route } from "./+types/_index";
import { PuckRender } from "~/components/puck-render";
import { resolvePuckPath } from "~/lib/resolve-puck-path.server";
import { getPage } from "~/lib/pages.server";

export async function loader() {
  const { isEditorRoute, path } = resolvePuckPath("/");
  let page = await getPage(path);

  if (!page) {
    throw new Response("Not Found", { status: 404 });
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
      title: loaderData.data.root.props?.title ?? "",
    },
  ];
}

export default function PuckSplatRoute({ loaderData }: Route.ComponentProps) {
  return <PuckRender data={loaderData.data} />;
}
