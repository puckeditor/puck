import path from "node:path";
import type { TanStackStartInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { FrameworkAdapter } from "./adapter";
import { findCloudRoute } from "./adapter";
import { templateText } from "../templates/source";
import { TANSTACK_START_CLOUD_ROUTE, withCloudHost } from "../templates/cloud";
import {
  configModuleTarget,
  configRelocation,
  copyTemplateFiles,
  planCoreDependency,
  planPuckConfig,
  RelocateContext,
  TemplateFile,
  upgradeTemplateFile,
  planAiRoute,
  flagCombos,
  renderCode,
  upgradeVariant,
} from "./shared";
import { AI_SNIPPET } from "./ai";
import { planOptimizeDeps } from "./vite";
import {
  CORE_PACKAGE,
  PLUGIN_AI_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";
import {
  cloudPagesServer,
  TANSTACK_PAGES_SPLAT,
  tanstackPagesEditor,
  tanstackPagesLib,
} from "../templates/pages";
import { tanstackPuckAuth } from "../templates/auth";
import {
  planAuthPlugin,
  planRouteAuth,
  warnLocalPages,
  withAuthPlugin,
} from "./pages-auth";

export const TANSTACK_START_CLOUD_ROUTE_FILE = (routesDir: string) =>
  `${routesDir}/api/puck/$.ts`;

/** Every recipe file must be mapped or deliberately excluded */
export const TANSTACK_START_EDITOR_EXCLUDED = [
  ".gitignore",
  "README.md",
  "package.json",
  "src/routeTree.gen.ts",
  "src/router.tsx",
  "src/routes/__root.tsx",
  "src/styles.css",
  "tsconfig.json",
  "vite.config.ts",
];

export const TANSTACK_START_EDITOR_MAPPED = [
  "database.json",
  "puck.config.tsx",
  "src/components/puck-render.tsx",
  "src/lib/pages.server.ts",
  "src/lib/pages.ts",
  "src/lib/resolve-puck-path.ts",
  "src/routes/$.tsx",
  "src/routes/index.tsx",
];

export const TANSTACK_START_AI_EDITOR_EXCLUDED = TANSTACK_START_EDITOR_EXCLUDED;

export const TANSTACK_START_AI_EDITOR_MAPPED = [
  ...TANSTACK_START_EDITOR_MAPPED,
  "src/routes/api/puck/$.ts",
].sort();

const AI_ROUTE = "src/routes/api/puck/$.ts";

const INDEX_ROUTES = ["tsx", "ts", "jsx", "js"].map((ext) => `index.${ext}`);

/** Recipe paths → project paths, for the project's src and routes directories */
const locate = (info: TanStackStartInfo) => (from: string) => {
  const rel = (dir: string, file: string) => (dir ? `${dir}/${file}` : file);
  if (from.startsWith("src/routes/"))
    return rel(info.routesDir, from.slice("src/routes/".length));
  if (from.startsWith("src/")) return rel(info.srcDir, from.slice(4));
  return from;
};

const tanstackRelocation = (
  p: Planner,
  info: TanStackStartInfo
): RelocateContext => {
  const to = locate(info);
  const moduleId = (id: string) => to(`${id}.ts`).replace(/\.ts$/, "");
  return {
    moduleMap: {
      "src/lib/pages": moduleId("src/lib/pages"),
      "src/lib/pages.server": moduleId("src/lib/pages.server"),
      "src/lib/resolve-puck-path": moduleId("src/lib/resolve-puck-path"),
      "src/components/puck-render": moduleId("src/components/puck-render"),
      "src/lib/puck-auth": moduleId("src/lib/puck-auth"),
      "puck.config": configModuleTarget(p),
    },
    config: configRelocation(p),
  };
};

export const planTanStackStartEditor = (
  p: Planner,
  info: TanStackStartInfo,
  withAi = false
) => {
  const recipe = withAi ? "tanstack-start-ai" : "tanstack-start";
  const to = locate(info);
  const file = (from: string, extra: Partial<TemplateFile> = {}) => ({
    from,
    to: to(from),
    ...extra,
  });

  const files: TemplateFile[] = [
    file("src/routes/$.tsx"),
    file("src/lib/pages.ts"),
    file("src/lib/pages.server.ts"),
    file("src/lib/resolve-puck-path.ts"),
    file("src/components/puck-render.tsx"),
    { from: "database.json", to: "database.json", ifMissing: true },
  ];

  const homeExists = INDEX_ROUTES.some((f) =>
    p.vfs.exists(p.abs(path.posix.join(info.routesDir, f)))
  );
  if (homeExists) {
    p.warn(
      "PUCK-CLI-W-HOME-NOT-MANAGED",
      `Your existing ${info.routesDir}/index route is kept, so the home page isn't managed by Puck.`
    );
  } else {
    files.push(file("src/routes/index.tsx"));
  }

  planPuckConfig(p, recipe);
  copyTemplateFiles(p, recipe, files, tanstackRelocation(p, info));
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

export const planTanStackStartCloudRoute = (
  p: Planner,
  info: TanStackStartInfo,
  withAi = false
) => {
  const rel = TANSTACK_START_CLOUD_ROUTE_FILE(info.routesDir);
  const cloudRoute = withCloudHost(TANSTACK_START_CLOUD_ROUTE, p.cloudHost);
  const route = withAi
    ? withCloudHost(
        templateText(p.templates, "tanstack-start-ai", AI_ROUTE),
        p.cloudHost
      )
    : cloudRoute;
  const existing = p.state.cloud.routeFile;

  if (existing) {
    if (withAi) planAiRoute(p, existing, cloudRoute, route);
    if (existing !== p.state.cloud.expectedRouteFile) {
      p.warn(
        "PUCK-CLI-W-CLOUD-ROUTE-PATH",
        `Found a Puck Cloud handler at ${existing}. Puck expects it at /api/puck, so make sure it's served there.`
      );
    }
    return;
  }

  const outcome = p.createFile(rel, route, {
    capability: "cloud",
    summary: `Create ${rel} (Puck Cloud API route)`,
  });

  if (outcome === "conflict") {
    p.manual({
      id: "cloud:route-conflict",
      type: "manual_edit",
      capability: "cloud",
      required: true,
      file: rel,
      reason: "conflict",
      message: `${rel} already exists and doesn't use puckHandler.`,
      instructions:
        "Serve Puck Cloud requests from /api/puck/* using puckHandler from @puckeditor/cloud-client.",
      snippet: route,
    });
  }
};

/** Adds Puck AI to an editor that was set up before, by the CLI or by hand */
export const planTanStackStartAi = (p: Planner, info: TanStackStartInfo) => {
  const to = locate(info);
  const opts = tanstackRelocation(p, info);
  const upgrade = (from: string, summary: string) =>
    upgradeTemplateFile(p, {
      fromRecipe: "tanstack-start",
      toRecipe: "tanstack-start-ai",
      from,
      to: to(from),
      opts,
      capability: "ai",
      summary,
    });

  const pagesEditor = p.vfs.exists(p.abs(to(PAGES_EDITOR)));
  const editor = upgradeVariant(p, {
    ...splatVariants(p, info),
    want: { ai: true },
    capability: "ai",
    summary: `Add the Puck AI plugin to ${to(SPLAT)}`,
  });
  if (pagesEditor) {
    upgradeVariant(p, {
      ...pagesEditorVariants(p, info),
      want: { ai: true },
      capability: "ai",
      summary: `Add the Puck AI plugin to ${to(PAGES_EDITOR)}`,
    });
  }

  planOptimizeDeps(p, info, [CORE_PACKAGE, PLUGIN_AI_PACKAGE], "ai");

  if (editor === "upgraded" || editor === "already") {
    upgrade(
      "src/components/puck-render.tsx",
      `Render AI-designed components in ${to("src/components/puck-render.tsx")}`
    );
    return;
  }

  const file = p.state.scan.editorFiles[0] ?? to("src/routes/$.tsx");
  p.manual({
    id: "ai:editor",
    type: "manual_edit",
    capability: "ai",
    required: true,
    file,
    reason: "unsupported_shape",
    message: `${file} was customised, so the Puck AI plugin wasn't added automatically.`,
    instructions: `Add the Puck AI plugin to the <Puck> editor in ${file}, load "@puckeditor/plugin-ai/styles.css?url" as a stylesheet in the route's head, and wrap the config with withDynamicConfig wherever you <Render> Puck pages.`,
    snippet: AI_SNIPPET,
  });
};

const SPLAT = "src/routes/$.tsx";
const PAGES_LIB = "src/lib/pages.ts";
const PAGES_SERVER = "src/lib/pages.server.ts";
const PAGES_EDITOR = "src/routes/puck.tsx";

/** Gates the recipe's editor behind Sign in with Puck */
const gateRecipePagesLib = (code: string) => {
  const resolved = "const { isEditorRoute, path } = resolvePuckPath(pathname);";
  const at = code.indexOf(resolved) + resolved.length;
  return `${code.slice(0, at)}

    // Editing requires Sign in with Puck
    if (isEditorRoute) await requirePuckSession({ data: pathname });${code.slice(
      at
    )}`.replace(
    'import { resolvePuckPath } from "./resolve-puck-path";',
    'import { resolvePuckPath } from "./resolve-puck-path";\nimport { requirePuckSession } from "./puck-auth";'
  );
};

type Flags = { ai: boolean; pages: boolean; auth: boolean };

/** Every version of $.tsx the CLI writes */
const splatVariants = (p: Planner, info: TanStackStartInfo) => ({
  from: SPLAT,
  to: locate(info)(SPLAT),
  opts: tanstackRelocation(p, info),
  combos: flagCombos("ai", "pages", "auth"),
  source: ({ ai, pages, auth }: Flags) => {
    // With Pages, the editor is in routes/puck.tsx
    if (pages) return TANSTACK_PAGES_SPLAT;
    const code = templateText(
      p.templates,
      ai ? "tanstack-start-ai" : "tanstack-start",
      SPLAT
    );
    return auth ? withAuthPlugin(code, SPLAT) : code;
  },
});

/** Every version of lib/pages.ts, which loads pages for $.tsx */
const pagesLibVariants = (p: Planner, info: TanStackStartInfo) => ({
  from: PAGES_LIB,
  to: locate(info)(PAGES_LIB),
  opts: tanstackRelocation(p, info),
  combos: flagCombos("pages", "auth"),
  source: ({ pages, auth }: Omit<Flags, "ai">) => {
    if (pages) return tanstackPagesLib;
    const code = templateText(p.templates, "tanstack-start", PAGES_LIB);
    return auth ? gateRecipePagesLib(code) : code;
  },
});

/** Every version of the Pages editor, routes/puck.tsx */
const pagesEditorVariants = (p: Planner, info: TanStackStartInfo) => ({
  from: PAGES_EDITOR,
  to: locate(info)(PAGES_EDITOR),
  opts: tanstackRelocation(p, info),
  combos: flagCombos("ai", "auth"),
  source: ({ ai, auth }: Omit<Flags, "pages">) => {
    const code = tanstackPagesEditor({ ai, auth });
    return auth ? withAuthPlugin(code, PAGES_EDITOR) : code;
  },
});

/** Edits at /puck with the Pages plugin, and renders published pages */
export const planTanStackStartPages = (p: Planner, info: TanStackStartInfo) => {
  const to = locate(info);
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
  const upgrade = <F extends { pages: boolean }>(
    variants: {
      from: string;
      to: string;
      opts: RelocateContext;
      combos: F[];
      source: (flags: F) => string;
    },
    summary: string,
    snippet: string,
    onMatch?: (flags: F) => void
  ) => {
    const outcome = upgradeVariant<F>(p, {
      ...variants,
      want: { pages: true } as Partial<F>,
      capability: "pages",
      summary,
      onMatch,
    });
    const ok = outcome === "upgraded" || outcome === "already";
    if (!ok) manual(variants.to, snippet);
    return ok;
  };

  let flags = { ai: false, auth: false };
  const splat = upgrade(
    splatVariants(p, info),
    `Render pages published in Puck Cloud in ${to(SPLAT)}`,
    TANSTACK_PAGES_SPLAT,
    ({ ai, auth }) => (flags = { ai, auth })
  );
  // The recipe's $.tsx saves pages with them, so only once that's gone
  if (splat) {
    upgrade(
      pagesLibVariants(p, info),
      `Send /<path>/edit to the Puck Pages editor in ${to(PAGES_LIB)}`,
      tanstackPagesLib
    );
    upgrade(
      {
        from: PAGES_SERVER,
        to: to(PAGES_SERVER),
        opts: tanstackRelocation(p, info),
        combos: [{ pages: false }, { pages: true }],
        source: ({ pages }) =>
          pages
            ? cloudPagesServer(p.cloudHost)
            : templateText(p.templates, "tanstack-start", PAGES_SERVER),
      },
      `Read published pages from Puck Cloud in ${to(PAGES_SERVER)}`,
      cloudPagesServer(p.cloudHost)
    );
  }

  const editor = pagesEditorVariants(p, info);
  const rendered = renderCode(
    editor.source(flags),
    editor.from,
    editor.to,
    editor.opts
  );
  if (
    !rendered.ok ||
    p.createFile(editor.to, rendered.code, {
      capability: "pages",
      summary: `Create ${editor.to} (the Puck Pages editor)`,
    }) === "conflict"
  ) {
    manual(editor.to, tanstackPagesEditor({ ai: false, auth: false }));
  }

  planOptimizeDeps(p, info, [PLUGIN_PAGES_PACKAGE], "pages");
  planRouteAuth(p, "unowned", "pages");
  warnLocalPages(p);
};

/** Requires Sign in with Puck to edit, and for the Cloud route */
export const planTanStackStartAuth = (p: Planner, info: TanStackStartInfo) => {
  const to = locate(info);
  const helper = to("src/lib/puck-auth.ts");
  if (
    p.createFile(helper, tanstackPuckAuth(p.cloudHost), {
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
      instructions: `Export the requirePuckSession server function from ${helper}, or move your file and re-run the command.`,
      snippet: tanstackPuckAuth(p.cloudHost),
    });
  }

  // With Pages, the editor is its own route; otherwise $.tsx loads it
  const pagesEditor = p.vfs.exists(p.abs(to(PAGES_EDITOR)));
  const upgrade = (file: string) => ({
    want: { auth: true },
    capability: "auth" as const,
    summary: `Require Sign in with Puck in ${file}`,
  });
  const gate = pagesEditor
    ? upgradeVariant(p, {
        ...pagesEditorVariants(p, info),
        ...upgrade(to(PAGES_EDITOR)),
      })
    : upgradeVariant(p, {
        ...pagesLibVariants(p, info),
        ...upgrade(to(PAGES_LIB)),
      });
  if (!pagesEditor) {
    upgradeVariant(p, {
      ...splatVariants(p, info),
      want: { auth: true },
      capability: "auth",
      summary: `Add the Puck Auth plugin to ${to(SPLAT)}`,
    });
  }
  if (gate === "customized" || gate === "missing") {
    p.manual({
      id: "auth:editor-gate",
      type: "manual_edit",
      capability: "auth",
      required: false,
      file: to(pagesEditor ? PAGES_EDITOR : PAGES_LIB),
      reason: "unsupported_shape",
      message:
        "Your editor was customised, so it doesn't send signed-out visitors to sign in.",
      instructions:
        "Call requirePuckSession before loading the route that renders your editor. The Puck Cloud API route already requires Sign in with Puck.",
      snippet: `beforeLoad: ({ location }) => requirePuckSession({ data: location.href }),\n`,
    });
  }

  planAuthPlugin(p, to(pagesEditor ? PAGES_EDITOR : SPLAT));
  planOptimizeDeps(p, info, [PLUGIN_AUTH_PACKAGE], "auth");
  planRouteAuth(p, "puckAuth", "auth");
};

export const tanstackStartAdapter: FrameworkAdapter<TanStackStartInfo> = {
  recipe: (withAi) => (withAi ? "tanstack-start-ai" : "tanstack-start"),
  recipeCloudRoute: AI_ROUTE,
  appDir: (info) => info.srcDir,
  configDirs: (info) => ["", "src", info.srcDir],
  envDir: (info) => info.envDir,
  detectCloudRoute: (info, _vfs, _root, scan) => {
    const expectedRouteFile = TANSTACK_START_CLOUD_ROUTE_FILE(info.routesDir);
    return {
      expectedRouteFile,
      routeFile: findCloudRoute(scan, info.srcDir, expectedRouteFile),
      // File-based routes register themselves
      routeRegistered: "n/a",
    };
  },
  planEditor: planTanStackStartEditor,
  planCloudRoute: planTanStackStartCloudRoute,
  planAi: planTanStackStartAi,
  planPages: planTanStackStartPages,
  planAuth: planTanStackStartAuth,
  devUrl: "http://localhost:3000/edit",
  deployEnvWarning:
    "Set PUCK_API_KEY in your hosting provider's environment variables before deploying.",
};
