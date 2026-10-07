/**
 * Puck Pages templates, in recipe coordinates so each adapter's relocation
 * applies. The editor opens the page in the `path` query parameter, e.g.
 * /puck?path=/about, and saves to Puck Cloud through /api/puck/pages.
 */

/** `getPage` options, pointed at PUCK_CLOUD_URL when set */
export const getPageArgs = (host?: string) =>
  host ? `{ path, host: ${JSON.stringify(host)} }` : "{ path }";

const AI_PLUGIN = `const aiPlugin = createAiPlugin({
  // Allow users to switch between design and assembly mode.
  // Read more: https://puckeditor.com/docs/ai/design-mode
  designMode: {
    visible: true,
  },
  // Select design mode by default.
  defaultMode: "design",
});
`;

/** Next.js: app/puck/[...puckPath]/client.tsx */
export const nextPagesEditorClient = ({ ai }: { ai: boolean }) =>
  ai
    ? `"use client";

import { Puck, blocksPlugin, outlinePlugin } from "@puckeditor/core";
import { createAiPlugin } from "@puckeditor/plugin-ai";
import { createPagesPlugin } from "@puckeditor/plugin-pages";

import config from "../../../puck.config";

${AI_PLUGIN}
// Loads, saves and publishes pages in Puck Cloud
const pagesPlugin = createPagesPlugin();

// Place the ai plugin in the first position in the side nav.
const plugins = [aiPlugin, pagesPlugin, blocksPlugin(), outlinePlugin()];

export function Client() {
  return <Puck plugins={plugins} data={{}} config={config} />;
}
`
    : `"use client";

import { Puck } from "@puckeditor/core";
import { createPagesPlugin } from "@puckeditor/plugin-pages";
import config from "../../../puck.config";

// Loads, saves and publishes pages in Puck Cloud
const pagesPlugin = createPagesPlugin();

export function Client() {
  return <Puck plugins={[pagesPlugin]} config={config} data={{}} />;
}
`;

/** Next.js: app/puck/[...puckPath]/page.tsx */
export const nextPagesEditorPage = ({
  ai,
  auth,
}: {
  ai: boolean;
  auth: boolean;
}) => `/**
 * This file renders the Puck editor at /puck. The Pages plugin opens the page
 * in the \`path\` query parameter, e.g. /puck?path=/about, and saves it to
 * Puck Cloud.
 *
 * ${
   auth
     ? "Editing requires signing in with a Puck Cloud account in your organization."
     : "NB this route is public, and you will need to add authentication"
 }
 */

import "@puckeditor/core/puck.css";
${
  ai ? `import "@puckeditor/plugin-ai/styles.css";\n` : ""
}import "@puckeditor/plugin-pages/styles.css";
import { Metadata } from "next";
import { Client } from "./client";${
  auth ? `\nimport { requirePuckSession } from "../../../lib/puck-auth";` : ""
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Puck",
  };
}

${
  auth
    ? `export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const query = new URLSearchParams(await searchParams).toString();
  await requirePuckSession(\`/puck\${query ? \`?\${query}\` : ""}\`);

  return <Client />;
}`
    : `export default async function Page() {
  return <Client />;
}`
}

export const dynamic = "force-dynamic";
`;

/** Next.js: app/[...puckPath]/page.tsx */
export const nextPagesRenderPage = (host?: string) => `/**
 * This file implements a catch-all route that renders the pages published in
 * Puck Cloud. For any route visited (with exception of other hardcoded pages
 * in /app), it reads the published page with \`getPage\` and renders it using
 * <Render>.
 */

import { getPage } from "@puckeditor/cloud-client";
import { Client } from "./client";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Metadata } from "next";
import { cache } from "react";

// Read once per request, by both generateMetadata and the page
const getPublishedPage = cache(async (path: string) => {
  // Pages are published in Puck Cloud, so render them on each request
  await connection();

  return getPage(${getPageArgs(host)});
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ puckPath: string[] }>;
}): Promise<Metadata> {
  const { puckPath = [] } = await params;
  const path = \`/\${puckPath.join("/")}\`;

  return {
    title: (await getPublishedPage(path))?.root.props?.title,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ puckPath: string[] }>;
}) {
  const { puckPath = [] } = await params;
  const path = \`/\${puckPath.join("/")}\`;
  const data = await getPublishedPage(path);

  if (!data) {
    return notFound();
  }

  return <Client data={data} />;
}
`;

/** Next.js: redirects /<path>/edit to the editor */
export const NEXT_PAGES_PROXY = `import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  if (req.method === "GET") {
    // Redirect routes that match "/[...puckPath]/edit" to "/puck?path=/[...puckPath]"
    if (req.nextUrl.pathname.endsWith("/edit")) {
      const url = new URL("/puck", req.url);
      url.searchParams.set("path", req.nextUrl.pathname.slice(0, -5) || "/");

      return NextResponse.redirect(url);
    }
  }

  return res;
}
`;
