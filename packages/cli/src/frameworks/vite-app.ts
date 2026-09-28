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
import { CORE_PACKAGE, ENV_KEY, PLUGIN_AI_PACKAGE } from "../constants";
import {
  configModuleTarget,
  configRelocation,
  copyTemplateFiles,
  planCoreDependency,
  planPuckConfig,
  RelocateContext,
  TemplateFile,
  upgradeTemplateFile,
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
    const current = p.vfs.readText(p.abs(existing));
    if (withAi && current === cloudRoute) {
      p.modifyFile(existing, route, {
        capability: "ai",
        summary: `Enable Puck AI in ${existing}`,
      });
    }
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

  const editor = upgrade(
    "src/puck/editor.tsx",
    `Add the Puck AI plugin to ${to("src/puck/editor.tsx")}`
  );
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
  devUrl: "http://localhost:5173/edit",
  deployEnvWarning: `npm start runs server/prod.ts. Set ${ENV_KEY} in the environment wherever it runs.`,
};
