import path from "node:path";
import type { ReactRouterInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import { hasRoute, insertRoute, RouteEntry } from "../ast/react-router-routes";
import { REACT_ROUTER_CLOUD_ROUTE, withCloudHost } from "../templates/cloud";
import type { FrameworkAdapter, LegacyScaffold } from "./adapter";
import { findCloudRoute } from "./adapter";
import { versionOf } from "../detect/package-json";
import {
  CORE_PACKAGE,
  MANUAL_INTEGRATION_DOCS_URL,
  PLUGIN_AI_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";
import { templateText } from "../templates/source";
import { parseModule } from "../ast/parse";
import { getExportShape } from "../ast/exports";
import {
  configModuleTarget,
  configRelocation,
  copyTemplateFiles,
  planCoreDependency,
  planPuckConfig,
  RelocateContext,
  upgradeTemplateFile,
  planAiRoute,
  flagCombos,
  renderCode,
  upgradeVariant,
} from "./shared";
import { AI_SNIPPET } from "./ai";
import {
  reactRouterPagesEditor,
  reactRouterPagesServer,
  reactRouterPagesSplat,
} from "../templates/pages";
import { reactRouterPuckAuth } from "../templates/auth";
import {
  planAuthPlugin,
  planRouteAuth,
  warnLocalPages,
  withAuthPlugin,
} from "./pages-auth";
import { planOptimizeDeps } from "./vite";

export const REACT_ROUTER_CLOUD_ROUTE_FILE = (appDir: string) =>
  `${appDir}/routes/api.puck.ts`;

const CLOUD_ROUTE_ENTRY = { path: "api/puck/*", file: "routes/api.puck.ts" };

export const REACT_ROUTER_EDITOR_EXCLUDED = [
  ".gitignore",
  "README.md",
  "app/components/puck-render.tsx",
  "app/root.tsx",
  "app/routes.ts",
  "app/routes/_index.tsx",
  "package.json",
  "public/favicon.ico",
  "react-router.config.ts",
  "tsconfig.json",
  "vite.config.ts",
];

export const REACT_ROUTER_EDITOR_MAPPED = [
  "app/lib/pages.server.ts",
  "app/lib/resolve-puck-path.server.ts",
  "app/routes/puck-splat.tsx",
  "database.json",
  "puck.config.tsx",
];

export const REACT_ROUTER_AI_EDITOR_EXCLUDED = [
  ".gitignore",
  "README.md",
  "app/root.tsx",
  "app/routes.ts",
  "app/routes/_index.tsx",
  "package.json",
  "public/favicon.ico",
  "react-router.config.ts",
  "tsconfig.json",
  "vite.config.ts",
];

export const REACT_ROUTER_AI_EDITOR_MAPPED = [
  "app/components/puck-render.tsx",
  "app/lib/pages.server.ts",
  "app/lib/resolve-puck-path.server.ts",
  "app/routes/api.puck.ts",
  "app/routes/puck-splat.tsx",
  "database.json",
  "puck.config.tsx",
];

const AI_ROUTE = "app/routes/api.puck.ts";

const rrRelocation = (p: Planner, info: ReactRouterInfo): RelocateContext => {
  const A = info.appDir;
  return {
    moduleMap: {
      "app/lib/pages.server": `${A}/lib/pages.server`,
      "app/lib/resolve-puck-path.server": `${A}/lib/resolve-puck-path.server`,
      "app/components/puck-render": `${A}/components/puck-render`,
      "app/lib/puck-auth.server": `${A}/lib/puck-auth.server`,
      "puck.config": configModuleTarget(p),
    },
    aliases: { "~/": "app/" },
    config: configRelocation(p),
  };
};

export const EDITOR_ROUTE: RouteEntry = {
  path: "*",
  file: "routes/puck-splat.tsx",
};

const routeSnippet = (entry: RouteEntry) =>
  `route("${entry.path}", "${entry.file}"),`;

/** Registers a route in routes.ts, or asks for it to be added by hand */
const registerRoute = (
  p: Planner,
  info: ReactRouterInfo,
  entry: RouteEntry,
  capability: CapabilityId,
  opts: { position: "before-splat" | "end"; rejectExistingSplat?: boolean }
) => {
  const routesFile = info.routesFile;
  const manual = (reason: "conflict" | "unsupported_shape", detail: string) =>
    p.manual({
      id: `${capability}:routes`,
      type: "manual_edit",
      capability,
      required: true,
      file: routesFile ?? `${info.appDir}/routes.ts`,
      reason,
      message: `Couldn't register ${entry.file} automatically: ${detail}.`,
      instructions: `Register the route in ${
        routesFile ?? `${info.appDir}/routes.ts`
      }${entry.path === "*" ? "" : ' before any catch-all ("*") route'}.`,
      snippet: routeSnippet(entry),
    });

  if (!routesFile)
    return manual("unsupported_shape", "no routes file was found");

  const abs = p.abs(routesFile);
  const code = p.vfs.readText(abs) ?? "";
  const result = insertRoute(code, routesFile, entry, opts);

  if (result.status === "exists") return;
  if (result.status === "manual")
    return manual(result.reason, result.detail.replace(/\.$/, ""));

  p.modifyFile(routesFile, result.code, {
    capability,
    summary: `Register ${entry.file} in ${routesFile}`,
    inserted: [{ at: result.code.indexOf(result.text), text: result.text }],
  });
};

export const planReactRouterEditor = (
  p: Planner,
  info: ReactRouterInfo,
  withAi = false
) => {
  if (info.appDir.includes("/")) {
    p.manual({
      id: "editor:rr-app-dir",
      type: "manual_edit",
      capability: "editor",
      required: true,
      file: info.configFile ?? "react-router.config.ts",
      reason: "unsupported_shape",
      message: `appDirectory "${info.appDir}" is nested, which the CLI doesn't support yet.`,
      instructions: `Follow the manual integration guide: ${MANUAL_INTEGRATION_DOCS_URL}`,
    });
    return;
  }

  const A = info.appDir;
  const recipe = withAi ? "react-router-ai" : "react-router";

  planPuckConfig(p, recipe);
  copyTemplateFiles(
    p,
    recipe,
    [
      { from: "app/routes/puck-splat.tsx", to: `${A}/routes/puck-splat.tsx` },
      { from: "app/lib/pages.server.ts", to: `${A}/lib/pages.server.ts` },
      {
        from: "app/lib/resolve-puck-path.server.ts",
        to: `${A}/lib/resolve-puck-path.server.ts`,
      },
      ...(withAi
        ? [
            {
              from: "app/components/puck-render.tsx",
              to: `${A}/components/puck-render.tsx`,
            },
          ]
        : []),
      { from: "database.json", to: "database.json", ifMissing: true },
    ],
    rrRelocation(p, info)
  );

  registerRoute(p, info, EDITOR_ROUTE, "editor", {
    position: "end",
    rejectExistingSplat: true,
  });
  planOptimizeDeps(
    p,
    info,
    withAi ? [CORE_PACKAGE, PLUGIN_AI_PACKAGE] : [CORE_PACKAGE],
    "editor"
  );
  planCoreDependency(p);
  p.warn(
    "PUCK-CLI-W-EDITOR-PUBLIC",
    "The editor route is public. Add authentication before deploying."
  );
};

export const planReactRouterCloudRoute = (
  p: Planner,
  info: ReactRouterInfo,
  withAi = false
) => {
  const entry = CLOUD_ROUTE_ENTRY;
  const cloudRoute = withCloudHost(REACT_ROUTER_CLOUD_ROUTE, p.cloudHost);
  const route = withAi
    ? withCloudHost(
        templateText(p.templates, "react-router-ai", AI_ROUTE),
        p.cloudHost
      )
    : cloudRoute;
  let routeFile = p.state.cloud.routeFile;

  if (routeFile) {
    if (withAi) planAiRoute(p, routeFile, cloudRoute, route);
  } else {
    routeFile = REACT_ROUTER_CLOUD_ROUTE_FILE(info.appDir);
    const outcome = p.createFile(routeFile, route, {
      capability: "cloud",
      summary: `Create ${routeFile} (Puck Cloud API route)`,
    });
    if (outcome === "conflict") {
      p.manual({
        id: "cloud:route-conflict",
        type: "manual_edit",
        capability: "cloud",
        required: true,
        file: routeFile,
        reason: "conflict",
        message: `${routeFile} already exists and doesn't use puckHandler.`,
        instructions:
          "Serve Puck Cloud requests from /api/puck/* using puckHandler from @puckeditor/cloud-client.",
        snippet: route,
      });
      return;
    }
  }

  if (p.state.cloud.routeRegistered !== true) {
    registerRoute(
      p,
      info,
      { path: entry.path, file: path.posix.relative(info.appDir, routeFile) },
      "cloud",
      { position: "before-splat" }
    );
  }
};

/** Adds Puck AI to an editor that was set up before, by the CLI or by hand */
export const planReactRouterAi = (p: Planner, info: ReactRouterInfo) => {
  const A = info.appDir;

  // The AI recipe's config also exports the UserData type the editor uses
  if (p.state.puck.configFile === "puck.config.tsx") {
    const config = upgradeTemplateFile(p, {
      fromRecipe: "react-router",
      toRecipe: "react-router-ai",
      from: "puck.config.tsx",
      to: "puck.config.tsx",
      opts: { moduleMap: {} },
      capability: "ai",
      summary: "Export the UserData type from puck.config.tsx",
    });
    if (config === "upgraded") {
      const code = p.vfs.readText(p.abs("puck.config.tsx"))!;
      p.state.puck.configExports = getExportShape(
        parseModule(code, "puck.config.tsx")
      );
    }
  }

  const opts = rrRelocation(p, info);
  const pagesEditor = p.vfs.exists(p.abs(`${A}/${PAGES_EDITOR}`));
  const editor = upgradeVariant(p, {
    ...splatVariants(p, info),
    want: { ai: true },
    capability: "ai",
    summary: pagesEditor
      ? `Render AI-designed components in ${A}/routes/puck-splat.tsx`
      : `Add the Puck AI plugin to ${A}/routes/puck-splat.tsx`,
  });
  if (pagesEditor) {
    upgradeVariant(p, {
      ...pagesEditorVariants(p, info),
      want: { ai: true },
      capability: "ai",
      summary: `Add the Puck AI plugin to ${A}/${PAGES_EDITOR}`,
    });
  }

  planOptimizeDeps(p, info, [CORE_PACKAGE, PLUGIN_AI_PACKAGE], "ai");

  if (editor === "upgraded" || editor === "already") {
    const render = upgradeTemplateFile(p, {
      fromRecipe: "react-router",
      toRecipe: "react-router-ai",
      from: "app/components/puck-render.tsx",
      to: `${A}/components/puck-render.tsx`,
      opts,
      capability: "ai",
      summary: `Render AI-designed components in ${A}/components/puck-render.tsx`,
    });
    if (render === "missing") {
      copyTemplateFiles(
        p,
        "react-router-ai",
        [
          {
            from: "app/components/puck-render.tsx",
            to: `${A}/components/puck-render.tsx`,
          },
        ],
        opts,
        "ai"
      );
    }
    return;
  }

  const file = p.state.scan.editorFiles[0] ?? `${A}/routes/puck-splat.tsx`;
  p.manual({
    id: "ai:editor",
    type: "manual_edit",
    capability: "ai",
    required: true,
    file,
    reason: "unsupported_shape",
    message: `${file} was customised, so the Puck AI plugin wasn't added automatically.`,
    instructions: `Add the Puck AI plugin to the <Puck> editor in ${file}, load "@puckeditor/plugin-ai/styles.css?url" as a stylesheet, and wrap the config with withDynamicConfig wherever you <Render> Puck pages.`,
    snippet: AI_SNIPPET,
  });
};

const SPLAT = "routes/puck-splat.tsx";
const PAGES_EDITOR = "routes/puck.tsx";
const PAGES_EDITOR_ROUTE: RouteEntry = { path: "puck", file: PAGES_EDITOR };

/** Gates the recipe's editor behind Sign in with Puck */
const gateRecipeSplat = (code: string) => {
  const resolved = "const { isEditorRoute, path } = resolvePuckPath(pathname);";
  const loader = code.indexOf("export async function loader");
  const at = code.indexOf(resolved, loader) + resolved.length;
  return `${code.slice(0, at)}

  // Editing requires Sign in with Puck
  if (isEditorRoute) await requirePuckSession(request);${code.slice(at)}`
    .replace(
      "export async function loader({ params }: Route.LoaderArgs)",
      "export async function loader({ params, request }: Route.LoaderArgs)"
    )
    .replace(
      'import { getPage, savePage } from "~/lib/pages.server";',
      'import { getPage, savePage } from "~/lib/pages.server";\nimport { requirePuckSession } from "~/lib/puck-auth.server";'
    );
};

/** Every version of puck-splat.tsx the CLI writes */
const splatVariants = (p: Planner, info: ReactRouterInfo) => ({
  from: `app/${SPLAT}`,
  to: `${info.appDir}/${SPLAT}`,
  opts: rrRelocation(p, info),
  combos: flagCombos("ai", "pages", "auth"),
  source: ({
    ai,
    pages,
    auth,
  }: {
    ai: boolean;
    pages: boolean;
    auth: boolean;
  }) => {
    // With Pages, the editor is in routes/puck.tsx
    if (pages) return reactRouterPagesSplat({ ai });
    const code = templateText(
      p.templates,
      ai ? "react-router-ai" : "react-router",
      `app/${SPLAT}`
    );
    return auth ? withAuthPlugin(gateRecipeSplat(code), SPLAT) : code;
  },
});

/** Every version of the Pages editor, routes/puck.tsx */
const pagesEditorVariants = (p: Planner, info: ReactRouterInfo) => ({
  from: `app/${PAGES_EDITOR}`,
  to: `${info.appDir}/${PAGES_EDITOR}`,
  opts: rrRelocation(p, info),
  combos: flagCombos("ai", "auth"),
  source: ({ ai, auth }: { ai: boolean; auth: boolean }) => {
    const code = reactRouterPagesEditor({ ai, auth });
    return auth ? withAuthPlugin(code, PAGES_EDITOR) : code;
  },
});

/** Edits at /puck with the Pages plugin, and renders published pages */
export const planReactRouterPages = (p: Planner, info: ReactRouterInfo) => {
  const A = info.appDir;
  const opts = rrRelocation(p, info);
  const manual = (file: string, snippet: string) =>
    p.manual({
      id: `pages:${file}`,
      type: "manual_edit",
      capability: "pages",
      required: true,
      file,
      reason: "unsupported_shape",
      message: `${file} was customised or moved, so it wasn't changed to use Puck Pages.`,
      instructions: `Update ${file} to match this version, which uses pages stored in Puck Cloud.`,
      snippet,
    });

  let flags = { ai: false, auth: false };
  const splat = upgradeVariant(p, {
    ...splatVariants(p, info),
    want: { pages: true },
    capability: "pages",
    summary: `Render pages published in Puck Cloud in ${A}/${SPLAT}`,
    onMatch: ({ ai, auth }) => (flags = { ai, auth }),
  });

  if (splat === "customized" || splat === "missing") {
    manual(`${A}/${SPLAT}`, reactRouterPagesSplat({ ai: false }));
  } else {
    // The recipe's splat route saves pages with it, so only once that's gone
    const server = upgradeVariant(p, {
      from: "app/lib/pages.server.ts",
      to: `${A}/lib/pages.server.ts`,
      opts,
      combos: [{ pages: false }, { pages: true }],
      source: ({ pages }) =>
        pages
          ? reactRouterPagesServer(p.cloudHost)
          : templateText(
              p.templates,
              "react-router",
              "app/lib/pages.server.ts"
            ),
      want: { pages: true },
      capability: "pages",
      summary: `Read published pages from Puck Cloud in ${A}/lib/pages.server.ts`,
    });
    if (server === "customized" || server === "missing")
      manual(`${A}/lib/pages.server.ts`, reactRouterPagesServer(p.cloudHost));
  }

  const editor = pagesEditorVariants(p, info);
  const rendered = renderCode(
    editor.source(flags),
    editor.from,
    editor.to,
    opts
  );
  if (
    !rendered.ok ||
    p.createFile(editor.to, rendered.code, {
      capability: "pages",
      summary: `Create ${editor.to} (the Puck Pages editor)`,
    }) === "conflict"
  ) {
    manual(editor.to, reactRouterPagesEditor({ ai: false, auth: false }));
  }

  registerRoute(p, info, PAGES_EDITOR_ROUTE, "pages", {
    position: "before-splat",
  });
  planOptimizeDeps(p, info, [PLUGIN_PAGES_PACKAGE], "pages");
  planRouteAuth(p, "unowned", "pages");
  warnLocalPages(p);
};

/** Requires Sign in with Puck to edit, and for the Cloud route */
export const planReactRouterAuth = (p: Planner, info: ReactRouterInfo) => {
  const A = info.appDir;
  const helper = `${A}/lib/puck-auth.server.ts`;
  if (
    p.createFile(helper, reactRouterPuckAuth(p.cloudHost), {
      capability: "auth",
      summary: `Create ${helper} (requires Sign in with Puck)`,
    }) === "conflict"
  ) {
    p.manual({
      id: "auth:helper",
      type: "manual_edit",
      capability: "auth",
      required: true,
      file: helper,
      reason: "conflict",
      message: `${helper} already exists with different content.`,
      instructions: `Export requirePuckSession from ${helper}, or move your file and re-run the command.`,
      snippet: reactRouterPuckAuth(p.cloudHost),
    });
  }

  // With Pages, the editor is its own route
  const pagesEditor = p.vfs.exists(p.abs(`${A}/${PAGES_EDITOR}`));
  const file = `${A}/${pagesEditor ? PAGES_EDITOR : SPLAT}`;
  const upgrade = {
    want: { auth: true },
    capability: "auth" as const,
    summary: `Require Sign in with Puck in ${file}`,
  };
  const gate = pagesEditor
    ? upgradeVariant(p, { ...pagesEditorVariants(p, info), ...upgrade })
    : upgradeVariant(p, { ...splatVariants(p, info), ...upgrade });
  if (gate === "customized" || gate === "missing") {
    p.manual({
      id: "auth:editor-gate",
      type: "manual_edit",
      capability: "auth",
      required: false,
      file,
      reason: "unsupported_shape",
      message:
        "Your editor route was customised, so it doesn't send signed-out visitors to sign in.",
      instructions:
        "Call requirePuckSession in the loader of the route that renders your editor. The Puck Cloud API route already requires Sign in with Puck.",
      snippet: `import { requirePuckSession } from "~/lib/puck-auth.server";\n\nexport async function loader({ request }: Route.LoaderArgs) {\n  await requirePuckSession(request);\n  return null;\n}\n`,
    });
  }

  planAuthPlugin(p, file);
  planOptimizeDeps(p, info, [PLUGIN_AUTH_PACKAGE], "auth");
  planRouteAuth(p, "puckAuth", "auth");
};

const REACT_ROUTER_7 = "^7.18.0";

/** What React Router 8 does by default, which stops 7 warning about each */
const V8_FUTURE_FLAGS = `  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
`;

/** React Router 8 needs Node 22.22+, so older Nodes get React Router 7 */
export const reactRouterLegacyScaffold = (
  nodeVersion: string
): LegacyScaffold | null => {
  const [major, minor] = versionOf(nodeVersion) ?? [0, 0];
  if (major > 22 || (major === 22 && minor >= 22)) return null;
  return {
    dependencies: {
      "react-router": REACT_ROUTER_7,
      "@react-router/node": REACT_ROUTER_7,
      "@react-router/serve": REACT_ROUTER_7,
      "@react-router/dev": REACT_ROUTER_7,
    },
    node: ">=20.0.0",
    files: {
      "react-router.config.ts": (text) =>
        text.replace(/^} satisfies Config;/m, `${V8_FUTURE_FLAGS}$&`),
    },
    warning: `React Router 8 needs Node 22.22 or later, and this is Node ${nodeVersion}, so the app uses React Router 7. To move to React Router 8, upgrade Node and update react-router, @react-router/node, @react-router/serve and @react-router/dev to ^8.`,
  };
};

export const reactRouterAdapter: FrameworkAdapter<ReactRouterInfo> = {
  recipe: (withAi) => (withAi ? "react-router-ai" : "react-router"),
  legacyScaffold: reactRouterLegacyScaffold,
  recipeCloudRoute: REACT_ROUTER_CLOUD_ROUTE_FILE("app"),
  appDir: (info) => info.appDir,
  configDirs: (info) => ["", "src", info.appDir],
  envDir: (info) => info.envDir,
  detectCloudRoute: (info, vfs, root, scan) => {
    const expectedRouteFile = REACT_ROUTER_CLOUD_ROUTE_FILE(info.appDir);
    const routeFile = findCloudRoute(scan, info.appDir, expectedRouteFile);
    let routeRegistered = false;
    if (info.routesFile) {
      const code = vfs.readText(path.join(root, info.routesFile)) ?? "";
      routeRegistered = hasRoute(code, info.routesFile, {
        path: CLOUD_ROUTE_ENTRY.path,
        file: routeFile
          ? path.posix.relative(info.appDir, routeFile)
          : CLOUD_ROUTE_ENTRY.file,
      });
    }
    return { expectedRouteFile, routeFile, routeRegistered };
  },
  planEditor: planReactRouterEditor,
  planCloudRoute: planReactRouterCloudRoute,
  planAi: planReactRouterAi,
  planPages: planReactRouterPages,
  planAuth: planReactRouterAuth,
  devUrl: "http://localhost:5173/edit",
  deployEnvWarning:
    "react-router-serve doesn't load .env files. Set PUCK_API_KEY in the environment wherever the app runs in production.",
};
