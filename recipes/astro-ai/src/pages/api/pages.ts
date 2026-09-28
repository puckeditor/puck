// Loads and saves Puck pages for the editor
import type { APIRoute } from "astro";
import { getPage, savePage } from "../../lib/pages";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = await getPage(url.searchParams.get("path") ?? "/");
  return page
    ? Response.json(page)
    : Response.json({ error: "Not found" }, { status: 404 });
};

export const POST: APIRoute = async ({ request }) => {
  const { path, data } = await request.json();
  await savePage(path, data);
  return Response.json({ status: "ok" });
};
