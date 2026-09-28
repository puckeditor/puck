import { createFileRoute } from "@tanstack/react-router";

import { loadPuckPage } from "../lib/pages";
import { PuckRender } from "../components/puck-render";

export const Route = createFileRoute("/")({
  loader: () => loadPuckPage({ data: "/" }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.data.root.props?.title ?? "" }],
  }),
  component: Home,
});

function Home() {
  const { data } = Route.useLoaderData();

  return <PuckRender data={data} />;
}
