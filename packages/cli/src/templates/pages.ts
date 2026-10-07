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

/** React Router and TanStack Start: lib/pages.server.ts */
export const cloudPagesServer = (
  host?: string
) => `import { getPage as getPublishedPage } from "@puckeditor/cloud-client";

// Pages are edited and published in Puck Cloud
export async function getPage(path: string) {
  return getPublishedPage(${getPageArgs(host)});
}
`;

/** React Router: app/routes/puck-splat.tsx, which renders published pages */
export const reactRouterPagesSplat = ({
  ai,
}: {
  ai: boolean;
}) => `import { redirect } from "react-router";
${
  ai
    ? `
import type { Route } from "./+types/puck-splat";
import { resolvePuckPath } from "~/lib/resolve-puck-path.server";
import { getPage } from "~/lib/pages.server";
import { PuckRender } from "~/components/puck-render";
`
    : `import { Render } from "@puckeditor/core";

import type { Route } from "./+types/puck-splat";
import { config } from "../../puck.config";
import { resolvePuckPath } from "~/lib/resolve-puck-path.server";
import { getPage } from "~/lib/pages.server";
`
}
export async function loader({ params }: Route.LoaderArgs) {
  const pathname = params["*"] ?? "/";
  const { isEditorRoute, path } = resolvePuckPath(pathname);

  // Pages are edited at /puck, which opens the page in the path parameter
  if (isEditorRoute) {
    throw redirect(\`/puck?path=\${encodeURIComponent(path)}\`);
  }

  const page = await getPage(path);

  // Throw a 404 if data for the page does not exist
  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    path,
    data: page,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.data.root.props?.title ?? "",
    },
  ];
}

export default function PuckSplatRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      ${
        ai
          ? "<PuckRender data={loaderData.data} />"
          : "<Render config={config} data={loaderData.data} />"
      }
    </div>
  );
}
`;

/** React Router: app/routes/puck.tsx, the editor */
export const reactRouterPagesEditor = ({
  ai,
  auth,
}: {
  ai: boolean;
  auth: boolean;
}) => `import { Puck${
  ai ? ", blocksPlugin, outlinePlugin" : ""
} } from "@puckeditor/core";
${
  ai ? `import { createAiPlugin } from "@puckeditor/plugin-ai";\n` : ""
}import { createPagesPlugin } from "@puckeditor/plugin-pages";

import type { Route } from "./+types/puck";
import { config } from "../../puck.config";${
  auth ? `\nimport { requirePuckSession } from "~/lib/puck-auth.server";` : ""
}
import editorStyles from "@puckeditor/core/puck.css?url";${
  ai
    ? `\nimport aiPluginStyles from "@puckeditor/plugin-ai/styles.css?url";`
    : ""
}
import pagesPluginStyles from "@puckeditor/plugin-pages/styles.css?url";
${
  auth
    ? `
export async function loader({ request }: Route.LoaderArgs) {
  await requirePuckSession(request);

  return null;
}
`
    : ""
}
export function meta(_: Route.MetaArgs) {
  return [{ title: "Puck" }];
}
${ai ? `\n${AI_PLUGIN}` : ""}
// Loads, saves and publishes pages in Puck Cloud. The page to edit is in the
// path parameter, e.g. /puck?path=/about
const pagesPlugin = createPagesPlugin();
${
  ai
    ? `
// Place the ai plugin in the first position in the side nav.
const plugins = [aiPlugin, pagesPlugin, blocksPlugin(), outlinePlugin()];
`
    : ""
}
export default function PuckEditorRoute() {
  return (
    <>
      <link rel="stylesheet" href={editorStyles} id="puck-css" />${
        ai
          ? `\n      <link rel="stylesheet" href={aiPluginStyles} id="puck-plugin-ai-css" />`
          : ""
      }
      <link
        rel="stylesheet"
        href={pagesPluginStyles}
        id="puck-plugin-pages-css"
      />
      <Puck plugins={${
        ai ? "plugins" : "[pagesPlugin]"
      }} config={config} data={{}} />
    </>
  );
}
`;

/** TanStack Start: src/lib/pages.ts, without the editor */
export const tanstackPagesLib = `import { createServerFn } from "@tanstack/react-start";
import { notFound, redirect } from "@tanstack/react-router";

import { getPage } from "./pages.server";
import { resolvePuckPath } from "./resolve-puck-path";

// Loads the published page for a URL
export const loadPuckPage = createServerFn({ method: "GET" })
  .validator((pathname: string) => pathname)
  .handler(async ({ data: pathname }) => {
    const { isEditorRoute, path } = resolvePuckPath(pathname);

    // Pages are edited at /puck, which opens the page in the path parameter
    if (isEditorRoute) {
      throw redirect({ href: \`/puck?path=\${encodeURIComponent(path)}\` });
    }

    const page = await getPage(path);

    // Throw a 404 if data for the page does not exist
    if (!page) {
      throw notFound();
    }

    return { path, data: page };
  });
`;

/** TanStack Start: src/routes/$.tsx, which renders published pages */
export const TANSTACK_PAGES_SPLAT = `import { createFileRoute } from "@tanstack/react-router";

import { loadPuckPage } from "../lib/pages";
import { PuckRender } from "../components/puck-render";

export const Route = createFileRoute("/$")({
  loader: ({ params }) => loadPuckPage({ data: params._splat ?? "" }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.data.root.props?.title ?? "" }],
  }),
  component: PuckSplatRoute,
});

function PuckSplatRoute() {
  const { data } = Route.useLoaderData();

  return <PuckRender data={data} />;
}
`;

/** TanStack Start: src/routes/puck.tsx, the editor */
export const tanstackPagesEditor = ({
  ai,
  auth,
}: {
  ai: boolean;
  auth: boolean;
}) => `import { createFileRoute } from "@tanstack/react-router";
import { Puck${
  ai ? ", blocksPlugin, outlinePlugin" : ""
} } from "@puckeditor/core";
${
  ai ? `import { createAiPlugin } from "@puckeditor/plugin-ai";\n` : ""
}import { createPagesPlugin } from "@puckeditor/plugin-pages";

import { config } from "../../puck.config";${
  auth ? `\nimport { requirePuckSession } from "../lib/puck-auth";` : ""
}

import editorStyles from "@puckeditor/core/puck.css?url";${
  ai
    ? `\nimport aiPluginStyles from "@puckeditor/plugin-ai/styles.css?url";`
    : ""
}
import pagesPluginStyles from "@puckeditor/plugin-pages/styles.css?url";

export const Route = createFileRoute("/puck")({${
  auth
    ? `
  beforeLoad: ({ location }) => requirePuckSession({ data: location.href }),`
    : ""
}
  head: () => ({
    meta: [{ title: "Puck" }],
    links: [
      { rel: "stylesheet", href: editorStyles },${
        ai ? `\n      { rel: "stylesheet", href: aiPluginStyles },` : ""
      }
      { rel: "stylesheet", href: pagesPluginStyles },
    ],
  }),
  component: PuckEditorRoute,
});
${ai ? `\n${AI_PLUGIN}` : ""}
// Loads, saves and publishes pages in Puck Cloud. The page to edit is in the
// path parameter, e.g. /puck?path=/about
const pagesPlugin = createPagesPlugin();
${
  ai
    ? `
// Place the ai plugin in the first position in the side nav.
const plugins = [aiPlugin, pagesPlugin, blocksPlugin(), outlinePlugin()];
`
    : ""
}
function PuckEditorRoute() {
  return <Puck plugins={${
    ai ? "plugins" : "[pagesPlugin]"
  }} config={config} data={{}} />;
}
`;

/** Vite: src/puck/root.tsx, which opens the editor at /puck */
export const vitePagesRoot = ({
  auth,
}: {
  auth: boolean;
}) => `import { lazy, Suspense } from "react";
import type { ReactNode } from "react";${
  auth ? `\nimport { RequireSession } from "./require-session";` : ""
}

// Loaded only when editing, so the editor stays out of your app's bundle
const Editor = lazy(() => import("./editor"));

/** The path being edited for URLs ending in /edit, e.g. /about/edit */
export const editorPath = (pathname: string) => {
  const segments = pathname.split("/");
  if (segments.at(-1) !== "edit") return null;
  return segments.slice(0, -1).join("/") || "/";
};

/** Renders the Puck editor at /puck, and your app everywhere else */
export function PuckRoot({ children }: { children: ReactNode }) {
  const { pathname } = window.location;
  const path = editorPath(pathname);

  // Pages are edited at /puck, which opens the page in the path parameter
  if (path !== null) {
    window.location.replace(\`/puck?path=\${encodeURIComponent(path)}\`);
    return null;
  }
  if (pathname !== "/puck") return children;

  return (
    // Fill the window, whatever layout styles your app gives its root
    <div style={{ position: "fixed", inset: 0, textAlign: "initial" }}>
      <Suspense>
        ${
          auth
            ? "<RequireSession>\n          <Editor />\n        </RequireSession>"
            : "<Editor />"
        }
      </Suspense>
    </div>
  );
}
`;

/** Vite: src/puck/editor.tsx */
export const vitePagesEditor = ({ ai }: { ai: boolean }) => `import { Puck${
  ai ? ", blocksPlugin, outlinePlugin" : ""
} } from "@puckeditor/core";
${
  ai ? `import { createAiPlugin } from "@puckeditor/plugin-ai";\n` : ""
}import { createPagesPlugin } from "@puckeditor/plugin-pages";
import "@puckeditor/core/puck.css";${
  ai ? `\nimport "@puckeditor/plugin-ai/styles.css";` : ""
}
import "@puckeditor/plugin-pages/styles.css";

import { config } from "../puck.config";
${ai ? `\n${AI_PLUGIN}` : ""}
// Loads, saves and publishes pages in Puck Cloud. The page to edit is in the
// path parameter, e.g. /puck?path=/about
const pagesPlugin = createPagesPlugin();
${
  ai
    ? `
// Place the ai plugin in the first position in the side nav.
const plugins = [aiPlugin, pagesPlugin, blocksPlugin(), outlinePlugin()];
`
    : ""
}
export default function Editor() {
  return <Puck plugins={${
    ai ? "plugins" : "[pagesPlugin]"
  }} config={config} data={{}} />;
}
`;

/** Hono: serves pages published in Puck Cloud to an app's renderer */
export const honoPublishedPages = (
  host?: string
) => `// Serves pages published in Puck Cloud
// Learn more: https://puckeditor.com/docs/cli
import { Hono } from "hono";
import { getPage } from "@puckeditor/cloud-client";

export const puckPages = new Hono().get("/api/pages", async (c) => {
  const path = c.req.query("path") ?? "/";
  const page = await getPage(${getPageArgs(host)});

  return page ? c.json(page) : c.json({ error: "Not found" }, 404);
});
`;
