import { Puck, type Data, type Config } from "@puckeditor/core";
import styles from "@puckeditor/core/puck.css";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import invariant from "tiny-invariant";

import puckConfig from "~/puck.config";
import { getPage, setPage } from "~/models/page.server";

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const puckPath = params.puckPath || "/";
  const formData = await request.formData();
  const puckData = formData.get("puckData");

  invariant(puckData, "Missing data");
  invariant(typeof puckData === "string", "Invalid data");

  setPage(puckPath, JSON.parse(puckData));

  return json({ ok: true });
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles, id: "puck-css" },
];

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const puckPath = params.puckPath || "/";
  const initialData = getPage(puckPath) || {
    content: [],
    root: {},
  };
  return json({ puckPath, initialData });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.initialData?.root?.props?.title || "Untitled page";

  return [{ title: `Editing: ${title}` }];
};

export default function Edit() {
  const { initialData } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <Puck
      config={puckConfig as Config}
      data={initialData}
      onPublish={async (data: Data) => {
        // Use form data here because it's the usual remix way.
        let formData = new FormData();
        formData.append("puckData", JSON.stringify(data));
        submit(formData, { method: "post" });
      }}
    />
  );
}
