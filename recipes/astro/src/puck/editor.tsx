import { useEffect, useState } from "react";
import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

import { config } from "../puck.config";
import { loadPage, savePage } from "./pages";

// Empty shell for new pages
const emptyPage: Data = { content: [], root: { props: { title: "" } } };

// e.g. /edit?path=/about, where there are no server routes for each page
const pathFromQuery = () =>
  new URLSearchParams(window.location.search).get("path") ?? "/";

export default function Editor({ path = pathFromQuery() }: { path?: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    loadPage(path).then((page) => setData(page ?? emptyPage));
  }, [path]);

  if (!data) return null;

  return (
    <Puck
      config={config}
      data={data}
      onPublish={(data) => savePage(path, data)}
    />
  );
}
