import path from "node:path";
import type { ViteInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import type { FrameworkAdapter } from "./adapter";
import { findCloudRoute } from "./adapter";
import { ensureConfigEntry, ensurePlugin } from "../ast/config-object";
import { ensureRootWrapped } from "../ast/react-root";
import { ensureMounted, isMounted } from "../ast/server-app";
import { templateText } from "../templates/source";
import { withCloudHost, withoutAiOptions } from "../templates/cloud";
import { LOCAL_PAGES_MODULE } from "../templates/client";
import {
  CORE_PACKAGE,
  ENV_KEY,
  PLUGIN_AI_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";
import {
  honoPublishedPages,
  vitePagesEditor,
  vitePagesRoot,
} from "../templates/pages";
import { REQUIRE_SESSION } from "../templates/auth";
import {
  planAuthPlugin,
  planRouteAuth,
  warnLocalPages,
  withAuthPlugin,
} from "./pages-auth";
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
  upgradeVariant,
} from "./shared";
import { planOptimizeDeps } from "./vite";
import { AI_SNIPPET } from "./ai";

/** Every recipe file must be mapped or deliberately excluded */
export const VITE_EXCLUDED = [
  ".gitignore",
  "README.md",
  "index.html",
  "package.json",
  "src/App.tsx",
  "src/main.tsx",
  "tsconfig.app.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
];

export const VITE_MAPPED = [
  "database.json",
  "server/index.ts",
  "server/prod.ts",
  "server/puck/pages.ts",
  "src/puck.config.tsx",
  "src/puck/editor.tsx",
  "src/puck/page.tsx",
  "src/puck/pages.ts",
  "src/puck/root.tsx",
];

export const VITE_AI_EXCLUDED = VITE_EXCLUDED;

export const VITE_AI_MAPPED = [...VITE_MAPPED, "server/puck/cloud.ts"].sort();

const SERVER_ENTRY = "server/index.ts";
const CLOUD_ROUTE = "server/puck/cloud.ts";
const DEV_SERVER = {
  importName: "devServer",
  source: "@hono/vite-dev-server",
  call: (q: string) =>
    `devServer({ entry: ${q}${SERVER_ENTRY}${q}, exclude: [/^(?!\\/api\\/).*/] })`,
};

const SERVER_PACKAGES = [
  { name: "hono", range: "^4.13.9" },
  { name: "@hono/node-server", range: "^2.1.1" },
];
const SERVER_DEV_PACKAGES = [
  { name: "@hono/vite-dev-server", range: "^0.26.1" },
  { name: "tsx", range: "^4.23.0" },
];

/** Recipe paths → project paths, for the app's source directory */
const locate = (info: ViteInfo) => (from: string) =>
  from.startsWith("src/")
    ? path.posix.join(info.srcDir || ".", from.slice(4))
    : from;

const viteRelocation = (p: Planner, info: ViteInfo): RelocateContext => {
  const to = locate(info);
  const moduleId = (id: string) => to(`${id}.ts`).replace(/\.ts$/, "");
  return {
    moduleMap: {
      "src/puck/pages": moduleId("src/puck/pages"),
      "src/puck/editor": moduleId("src/puck/editor"),
      "src/puck/require-session": moduleId("src/puck/require-session"),
      "src/puck.config": configModuleTarget(p, to("src/puck.config.tsx")),
    },
    config: configRelocation(p),
  };
};

const modeOf = (p: Planner, info: ViteInfo) =>
  p.backend?.mode ?? info.backend?.mode ?? "none";

/** Edits vite.config, or asks for the edit when its shape isn't supported */
const editViteConfig = (
  p: Planner,
  info: ViteInfo,
  capability: CapabilityId,
  what: string,
  snippet: string,
  edit: (code: string, file: string) => ReturnType<typeof ensurePlugin>
) => {
  const file = info.viteConfig ?? "vite.config.ts";
  const manual = (detail: string) =>
    p.manual({
      id: `${capability}:vite-config:${what}`,
      type: "manual_edit",
      capability,
      required: true,
      file,
      reason: "unsupported_shape",
      message: `Couldn't ${what} in ${file} automatically: ${detail}.`,
      instructions: `Update ${file} to ${what}.`,
      snippet,
    });
  if (!info.viteConfig) return manual("no vite.config file was found");

  const result = edit(p.vfs.readText(p.abs(file)) ?? "", file);
  if (result.status === "exists") return;
  if (result.status === "manual") return manual(result.detail);
  p.modifyFile(file, result.code, {
    capability,
    summary: `${what[0].toUpperCase()}${what.slice(1)} in ${file}`,
    inserted: result.inserted,
  });
};

/** A Hono server in server/, run by Vite in development */
const planServer = (p: Planner, info: ViteInfo) => {
  copyTemplateFiles(
    p,
    "vite",
    [
      { from: SERVER_ENTRY, to: SERVER_ENTRY },
      { from: "server/prod.ts", to: "server/prod.ts" },
      { from: "server/puck/pages.ts", to: "server/puck/pages.ts" },
      { from: "database.json", to: "database.json", ifMissing: true },
    ],
    { moduleMap: {} }
  );
  editViteConfig(
    p,
    info,
    "editor",
    "serve Puck's APIs with @hono/vite-dev-server",
    `import devServer from "@hono/vite-dev-server";\n\n// in plugins:\n${DEV_SERVER.call(
      '"'
    )},`,
    (code, file) => ensurePlugin(code, file, DEV_SERVER)
  );
  for (const { name, range } of SERVER_PACKAGES)
    if (!(name in p.ctx.deps)) p.addDependency(name, range, "editor");
  for (const { name, range } of SERVER_DEV_PACKAGES)
    if (!(name in p.ctx.deps))
      p.addDependency(name, range, "editor", { dev: true });

  const text = p.vfs.readText(p.abs("package.json")) ?? "{}";
  const pkg = JSON.parse(text);
  if (!pkg.scripts?.start) {
    pkg.scripts = { ...pkg.scripts, start: "tsx server/prod.ts" };
    p.modifyFile("package.json", JSON.stringify(pkg, null, 2) + "\n", {
      capability: "editor",
      summary: "Add a start script that serves the built app and Puck's APIs",
    });
  }
  p.warn(
    "PUCK-CLI-W-PAGES-PUBLIC",
    "The /api/pages route is public. Add authentication before deploying."
  );
};

export const planViteEditor = (p: Planner, info: ViteInfo, withAi = false) => {
  const recipe = withAi ? "vite-ai" : "vite";
  const mode = modeOf(p, info);
  const to = locate(info);
  const opts = viteRelocation(p, info);
  const file = (from: string): TemplateFile => ({ from, to: to(from) });

  planPuckConfig(p, recipe, {
    from: "src/puck.config.tsx",
    to: to("src/puck.config.tsx"),
  });
  copyTemplateFiles(
    p,
    recipe,
    [
      file("src/puck/root.tsx"),
      file("src/puck/editor.tsx"),
      file("src/puck/page.tsx"),
      ...(mode === "none" ? [] : [file("src/puck/pages.ts")]),
    ],
    opts
  );
  if (mode === "none") {
    p.createFile(to("src/puck/pages.ts"), LOCAL_PAGES_MODULE, {
      capability: "editor",
      summary: `Create ${to("src/puck/pages.ts")} (saves pages in the browser)`,
    });
    p.warn(
      "PUCK-CLI-W-BROWSER-STORAGE",
      "Without a server, pages are saved in each browser's localStorage. Re-run with --backend add to store them on a server."
    );
  }

  // Wrap the app so /edit URLs open the editor
  const entry = info.entry;
  const rootModule = path.posix.relative(
    path.posix.dirname(entry ?? "src/main.tsx"),
    to("src/puck/root")
  );
  const source = rootModule.startsWith(".") ? rootModule : `./${rootModule}`;
  const wrapResult = entry
    ? ensureRootWrapped(p.vfs.readText(p.abs(entry)) ?? "", entry, {
        component: "PuckRoot",
        source,
      })
    : ({ status: "manual", detail: "no entry module was found" } as const);
  if (wrapResult.status === "inserted") {
    p.modifyFile(entry!, wrapResult.code, {
      capability: "editor",
      summary: `Open the Puck editor at /edit URLs in ${entry}`,
      inserted: wrapResult.inserted,
    });
  } else if (wrapResult.status === "manual") {
    p.manual({
      id: "editor:root",
      type: "manual_edit",
      capability: "editor",
      required: true,
      file: entry ?? "src/main.tsx",
      reason: "unsupported_shape",
      message: `Couldn't add PuckRoot automatically: ${wrapResult.detail}.`,
      instructions:
        "Wrap your app in <PuckRoot> where it's rendered, so URLs ending in /edit open the editor.",
      snippet: `import { PuckRoot } from "${source}";\n\n<PuckRoot>\n  <App />\n</PuckRoot>`,
    });
  }

  if (!p.scaffolded) {
    p.manual({
      id: "editor:render",
      type: "manual_edit",
      capability: "editor",
      required: false,
      file: to("src/App.tsx"),
      reason: "optional",
      message:
        "Render published pages with <PuckPage> wherever your app renders pages.",
      instructions:
        "PuckPage loads the page published at `path` and renders it, or `fallback` when there isn't one.",
      snippet: `import { PuckPage } from "./puck/page";\n\n<PuckPage path={window.location.pathname} fallback={<NotFound />} />`,
    });
  }

  if (mode === "add") planServer(p, info);
  if (mode === "external") {
    const url = p.backend?.url ?? "http://localhost:3000";
    editViteConfig(
      p,
      info,
      "editor",
      `proxy /api to ${url}`,
      `server: {\n  proxy: {\n    "/api": "${url}",\n  },\n},`,
      (code, file) =>
        ensureConfigEntry(code, file, ["server", "proxy"], "/api", url)
    );
    p.warn(
      "PUCK-CLI-W-PROXY-PRODUCTION",
      `The dev server proxies /api to ${url}. In production, serve the built app behind the same proxy.`
    );
  }

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

const serverIndexMounts = (p: Planner) =>
  isMounted(p.vfs.readText(p.abs(SERVER_ENTRY)) ?? "", SERVER_ENTRY, "hono", {
    source: "./puck/cloud.js",
  });

export const planViteCloudRoute = (
  p: Planner,
  info: ViteInfo,
  withAi = false
) => {
  const aiRoute = templateText(p.templates, "vite-ai", CLOUD_ROUTE);
  const route = withCloudHost(
    withAi ? aiRoute : withoutAiOptions(aiRoute),
    p.cloudHost
  );
  const cloudRoute = withCloudHost(withoutAiOptions(aiRoute), p.cloudHost);
  const existing = p.state.cloud.routeFile;

  if (existing) {
    if (withAi) planAiRoute(p, existing, cloudRoute, route, { warn: false });
  } else {
    p.createFile(CLOUD_ROUTE, route, {
      capability: "cloud",
      summary: `Create ${CLOUD_ROUTE} (Puck Cloud API route)`,
    });
  }

  if (!serverIndexMounts(p)) {
    const code = p.vfs.readText(p.abs(SERVER_ENTRY)) ?? "";
    const result = ensureMounted(code, SERVER_ENTRY, "hono", {
      name: "puckCloud",
      source: "./puck/cloud.js",
    });
    if (result.status === "inserted") {
      p.modifyFile(SERVER_ENTRY, result.code, {
        capability: "cloud",
        summary: `Mount puckCloud in ${SERVER_ENTRY}`,
        inserted: result.inserted,
      });
    } else if (result.status === "manual") {
      p.manual({
        id: "cloud:mount",
        type: "manual_edit",
        capability: "cloud",
        required: true,
        file: SERVER_ENTRY,
        reason: "unsupported_shape",
        message: `Couldn't mount puckCloud automatically: ${result.detail}.`,
        instructions: `Mount puckCloud from ${CLOUD_ROUTE} on the Hono app in ${SERVER_ENTRY}.`,
        snippet: `import { puckCloud } from "./puck/cloud.js";\n\napp.route("/", puckCloud);`,
      });
    }
  }
};

/** Adds Puck AI to an editor that was set up before */
export const planViteAi = (p: Planner, info: ViteInfo) => {
  const to = locate(info);
  const opts = viteRelocation(p, info);
  const upgrade = (from: string, summary: string) =>
    upgradeTemplateFile(p, {
      fromRecipe: "vite",
      toRecipe: "vite-ai",
      from,
      to: to(from),
      opts,
      capability: "ai",
      summary,
    });

  const editor = upgradeVariant(p, {
    ...editorVariants(p, info),
    want: { ai: true },
    capability: "ai",
    summary: `Add the Puck AI plugin to ${to(EDITOR)}`,
  });
  planOptimizeDeps(p, info, [CORE_PACKAGE, PLUGIN_AI_PACKAGE], "ai");

  if (editor === "upgraded" || editor === "already") {
    upgrade(
      "src/puck/page.tsx",
      `Render AI-designed components in ${to("src/puck/page.tsx")}`
    );
    return;
  }

  const file = p.state.scan.editorFiles[0] ?? to("src/puck/editor.tsx");
  p.manual({
    id: "ai:editor",
    type: "manual_edit",
    capability: "ai",
    required: true,
    file,
    reason: "unsupported_shape",
    message: `${file} was customised, so the Puck AI plugin wasn't added automatically.`,
    instructions: `Add the Puck AI plugin to the <Puck> editor in ${file}, import "@puckeditor/plugin-ai/styles.css", and wrap the config with withDynamicConfig wherever you <Render> Puck pages.`,
    snippet: AI_SNIPPET,
  });
};

const ROOT = "src/puck/root.tsx";
const EDITOR = "src/puck/editor.tsx";
const PAGES_API = "server/puck/pages.ts";

type Flags = { ai: boolean; pages: boolean; auth: boolean };

/** Gates the recipe's editor behind Sign in with Puck */
const gateRecipeRoot = (code: string) =>
  code
    .replace(
      'import type { ReactNode } from "react";',
      'import type { ReactNode } from "react";\nimport { RequireSession } from "./require-session";'
    )
    .replace(
      "<Editor path={path} />",
      "<RequireSession>\n          <Editor path={path} />\n        </RequireSession>"
    );

/** Every version of root.tsx the CLI writes */
const rootVariants = (p: Planner, info: ViteInfo) => ({
  from: ROOT,
  to: locate(info)(ROOT),
  opts: viteRelocation(p, info),
  combos: flagCombos("pages", "auth"),
  source: ({ pages, auth }: Omit<Flags, "ai">) => {
    if (pages) return vitePagesRoot({ auth });
    const code = templateText(p.templates, "vite", ROOT);
    return auth ? gateRecipeRoot(code) : code;
  },
});

/** Every version of editor.tsx the CLI writes */
const editorVariants = (p: Planner, info: ViteInfo) => ({
  from: EDITOR,
  to: locate(info)(EDITOR),
  opts: viteRelocation(p, info),
  combos: flagCombos("ai", "pages", "auth"),
  source: ({ ai, pages, auth }: Flags) => {
    const code = pages
      ? vitePagesEditor({ ai })
      : templateText(p.templates, ai ? "vite-ai" : "vite", EDITOR);
    return auth ? withAuthPlugin(code, EDITOR) : code;
  },
});

/** Edits at /puck with the Pages plugin, and serves published pages */
export const planVitePages = (p: Planner, info: ViteInfo) => {
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
  const failed = (outcome: string) =>
    outcome === "customized" || outcome === "missing";

  const want = { pages: true };
  if (
    failed(
      upgradeVariant(p, {
        ...editorVariants(p, info),
        want,
        capability: "pages",
        summary: `Add the Puck Pages plugin to ${to(EDITOR)}`,
      })
    )
  )
    manual(to(EDITOR), vitePagesEditor({ ai: false }));
  if (
    failed(
      upgradeVariant(p, {
        ...rootVariants(p, info),
        want,
        capability: "pages",
        summary: `Open the Puck Pages editor at /puck in ${to(ROOT)}`,
      })
    )
  )
    manual(to(ROOT), vitePagesRoot({ auth: false }));

  // PuckPage loads pages from /api/pages, served by the app's server
  if (modeOf(p, info) === "external") {
    p.warn(
      "PUCK-CLI-W-EXTERNAL-PAGES",
      `Pages are loaded from ${
        p.backend?.url ?? "the server /api is proxied to"
      }. Run \`npx @puckeditor/cli add pages\` in that server's project, so /api/pages serves pages published in Puck Cloud.`
    );
  } else {
    const api = upgradeVariant(p, {
      from: PAGES_API,
      to: PAGES_API,
      opts: { moduleMap: {} },
      combos: [{ pages: false }, { pages: true }],
      source: ({ pages }) =>
        pages
          ? honoPublishedPages(p.cloudHost)
          : templateText(p.templates, "vite", PAGES_API),
      want,
      capability: "pages",
      summary: `Serve pages published in Puck Cloud from ${PAGES_API}`,
    });
    if (failed(api)) manual(PAGES_API, honoPublishedPages(p.cloudHost));
    planRouteAuth(p, "unowned", "pages");
    warnLocalPages(p);
  }

  planOptimizeDeps(p, info, [PLUGIN_PAGES_PACKAGE], "pages");
};

/** Requires Sign in with Puck to edit, and for the Cloud route */
export const planViteAuth = (p: Planner, info: ViteInfo) => {
  const to = locate(info);
  p.createFile(to("src/puck/require-session.tsx"), REQUIRE_SESSION, {
    capability: "auth",
    summary: `Create ${to(
      "src/puck/require-session.tsx"
    )} (sends signed-out visitors to Sign in with Puck)`,
  });

  const gate = upgradeVariant(p, {
    ...rootVariants(p, info),
    want: { auth: true },
    capability: "auth",
    summary: `Require Sign in with Puck to edit in ${to(ROOT)}`,
  });
  if (gate === "customized" || gate === "missing") {
    p.manual({
      id: "auth:editor-gate",
      type: "manual_edit",
      capability: "auth",
      required: false,
      file: to(ROOT),
      reason: "unsupported_shape",
      message:
        "Your editor was customised, so it doesn't send signed-out visitors to sign in.",
      instructions:
        "Wrap your editor in <RequireSession>. The Puck Cloud API route already requires Sign in with Puck.",
      snippet: `import { RequireSession } from "./require-session";\n\n<RequireSession>\n  <Editor />\n</RequireSession>\n`,
    });
  }

  planAuthPlugin(p, to(EDITOR));
  planOptimizeDeps(p, info, [PLUGIN_AUTH_PACKAGE], "auth");

  if (modeOf(p, info) === "external") {
    p.warn(
      "PUCK-CLI-W-EXTERNAL-AUTH",
      `Puck Cloud requests go to ${
        p.backend?.url ?? "the server /api is proxied to"
      }. Run \`npx @puckeditor/cli add auth\` in that server's project to require Sign in with Puck there.`
    );
  } else {
    planRouteAuth(p, "signIn", "auth");
  }
};

export const viteAdapter: FrameworkAdapter<ViteInfo> = {
  recipe: (withAi) => (withAi ? "vite-ai" : "vite"),
  recipeCloudRoute: CLOUD_ROUTE,
  appDir: (info) => info.srcDir,
  configDirs: (info) => ["", "src", info.srcDir],
  // server/index.ts loads .env.local from the project root
  envDir: () => "",
  backend: (info) => ({
    existing: info.backend
      ? info.backend.mode === "local"
        ? { mode: "local" }
        : { mode: "external", url: info.backend.url ?? undefined }
      : null,
    addLabel: "Add a Hono server to this app, run by Vite in development",
  }),
  detectCloudRoute: (info, vfs, root, scan) => {
    const routeFile = findCloudRoute(scan, "server", CLOUD_ROUTE);
    const index = vfs.readText(path.join(root, SERVER_ENTRY)) ?? "";
    return {
      expectedRouteFile: CLOUD_ROUTE,
      routeFile,
      routeRegistered: routeFile
        ? isMounted(index, SERVER_ENTRY, "hono", {
            source: "./puck/cloud.js",
          })
        : "n/a",
      external: info.backend?.mode === "external",
    };
  },
  planEditor: planViteEditor,
  planCloudRoute: planViteCloudRoute,
  planAi: planViteAi,
  planPages: planVitePages,
  planAuth: planViteAuth,
  devUrl: "http://localhost:5173/edit",
  deployEnvWarning: `npm start runs server/prod.ts. Set ${ENV_KEY} in the environment wherever it runs.`,
};
