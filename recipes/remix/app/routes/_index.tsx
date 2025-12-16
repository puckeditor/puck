import { Render, type Config } from "@puckeditor/core";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import puckConfig from "~/puck.config";
import { getPage } from "~/models/page.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  // Get path, and default to slash for root path.
  const puckPath = params.puckPath || "/";
  // Get puckData for this path, this could be a database call.
  const puckData = getPage(puckPath);
  if (!puckData) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }
  // Return the data.
  return json({ puckData });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.puckData?.root?.props?.title || "Page";

  return [{ title }];
};

export default function Page() {
  const { puckData } = useLoaderData<typeof loader>();

  return <Render config={puckConfig as Config} data={puckData} />;
}
