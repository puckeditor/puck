import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

import { config } from "../puck.config";
import { loadPage } from "./pages";

/** Renders the published Puck page for a path, or `fallback` if there isn't one */
export function PuckPage({
  path,
  fallback = null,
}: {
  path: string;
  fallback?: ReactNode;
}) {
  const [data, setData] = useState<Data | null>();

  useEffect(() => {
    loadPage(path).then(setData);
  }, [path]);

  if (data === undefined) return null;
  if (data === null) return fallback;

  return <Render config={config} data={data} />;
}
