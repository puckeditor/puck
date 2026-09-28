import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import type { Data } from "@puckeditor/core";

import { getPage, savePage } from "./pages.server";
import { resolvePuckPath } from "./resolve-puck-path";

// Loads the page for a URL, or an empty page when editing a new path
export const loadPuckPage = createServerFn({ method: "GET" })
  .validator((pathname: string) => pathname)
  .handler(async ({ data: pathname }) => {
    const { isEditorRoute, path } = resolvePuckPath(pathname);
    let page = await getPage(path);

    // Throw a 404 if we're not rendering the editor and data for the page does not exist
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

    return { isEditorRoute, path, data: page as Data };
  });

export const publishPuckPage = createServerFn({ method: "POST" })
  .validator((input: { path: string; data: Data }) => input)
  .handler(async ({ data }) => {
    await savePage(data.path, data.data);
  });
