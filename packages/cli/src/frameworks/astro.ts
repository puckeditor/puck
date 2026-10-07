import type { AstroInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { FrameworkAdapter } from "./adapter";
import { findCloudRoute } from "./adapter";
import { ensureConfigEntry } from "../ast/config-object";
import { execCommand } from "../plan/install";
import { templateText } from "../templates/source";
import { withCloudHost, withoutAiOptions } from "../templates/cloud";
import { ASTRO_EDITOR_PAGE, LOCAL_PAGES_MODULE } from "../templates/client";
import { ENV_KEY } from "../constants";
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
} from "./shared";
import { AI_SNIPPET } from "./ai";

/** Every recipe file must be mapped or deliberately excluded */
export const ASTRO_EXCLUDED = [
  ".gitignore",
  "README.md",
  "astro.config.mjs",
  "package.json",
  "public/favicon.svg",
  "tsconfig.json",
];

export const ASTRO_MAPPED = [
  "database.json",
  "src/lib/pages.ts",
  "src/lib/resolve-puck-path.ts",
  "src/pages/[...puckPath].astro",
  "src/pages/api/pages.ts",
  "src/puck.config.tsx",
  "src/puck/editor.tsx",
  "src/puck/pages.ts",
  "src/puck/render.tsx",
];

export const ASTRO_AI_EXCLUDED = ASTRO_EXCLUDED;

export const ASTRO_AI_MAPPED = [
  ...ASTRO_MAPPED,
  "src/pages/api/puck/[...all].ts",
].sort();

const CLOUD_ROUTE = "src/pages/api/puck/[...all].ts";
const CATCH_ALL = /^\[\.\.\.[^\]]+\]\.(astro|md|mdx|ts|js)$/;

const astroRelocation = (p: Planner): RelocateContext => ({
  moduleMap: {
    "src/puck.config": configModuleTarget(p, "src/puck.config.tsx"),
  },
  config: configRelocation(p),
});

const modeOf = (p: Planner, info: AstroInfo) =>
  p.backend?.mode ?? info.backend?.mode ?? "none";

export const planAstroEditor = (
  p: Planner,
  info: AstroInfo,
  withAi = false
) => {
  const recipe = withAi ? "astro-ai" : "astro";
  const mode = modeOf(p, info);
  const onServer = mode === "local" || mode === "add";
  const opts = astroRelocation(p);

  // Astro's own tool adds integrations and updates astro.config and tsconfig
  const integrations = [
    ...(info.react ? [] : ["react"]),
    ...(mode === "add" && !info.adapter ? ["node"] : []),
  ];
  if (integrations.length) {
    p.runCommand(
      execCommand(p.ctx, "astro", ["add", ...integrations, "--yes"]),
      {
        capability: "editor",
        summary: `Add ${integrations
          .map((i) => `@astrojs/${i}`)
          .join(" and ")} with \`astro add\``,
      }
    );
  }

  planPuckConfig(p, recipe, {
    from: "src/puck.config.tsx",
    to: "src/puck.config.tsx",
  });

  const files: TemplateFile[] = [
    { from: "src/puck/editor.tsx", to: "src/puck/editor.tsx" },
  ];
  if (mode !== "none")
    files.push({ from: "src/puck/pages.ts", to: "src/puck/pages.ts" });

  if (onServer) {
    const pagesDir = p.abs("src/pages");
    const otherCatchAll = (p.vfs.isDir(pagesDir) ? p.vfs.list(pagesDir) : [])
      .map((entry) => entry.name)
      .find((f) => CATCH_ALL.test(f) && f !== "[...puckPath].astro");

    if (otherCatchAll) {
      p.manual({
        id: "editor:catch-all",
        type: "manual_edit",
        capability: "editor",
        required: true,
        file: `src/pages/${otherCatchAll}`,
        reason: "conflict",
        message: `src/pages/${otherCatchAll} already handles every URL, so Puck's page route wasn't added.`,
        instructions:
          "Render the Puck editor for URLs ending in /edit and published pages for the rest in your catch-all route.",
        snippet: templateText(
          p.templates,
          recipe,
          "src/pages/[...puckPath].astro"
        ),
      });
    } else {
      files.push({
        from: "src/pages/[...puckPath].astro",
        to: "src/pages/[...puckPath].astro",
      });
    }
    if (p.vfs.exists(p.abs("src/pages/index.astro"))) {
      p.warn(
        "PUCK-CLI-W-HOME-NOT-MANAGED",
        "Your existing src/pages/index.astro is kept, so the home page isn't managed by Puck."
      );
    }
    files.push(
      { from: "src/pages/api/pages.ts", to: "src/pages/api/pages.ts" },
      { from: "src/lib/pages.ts", to: "src/lib/pages.ts" },
      {
        from: "src/lib/resolve-puck-path.ts",
        to: "src/lib/resolve-puck-path.ts",
      },
      { from: "src/puck/render.tsx", to: "src/puck/render.tsx" },
      { from: "database.json", to: "database.json", ifMissing: true }
    );
  }
  copyTemplateFiles(p, recipe, files, opts);

  if (!onServer) {
    const outcome = p.createFile("src/pages/edit.astro", ASTRO_EDITOR_PAGE, {
      capability: "editor",
      summary: "Create src/pages/edit.astro (the Puck editor)",
    });
    if (outcome === "conflict") {
      p.manual({
        id: "editor:edit-page",
        type: "manual_edit",
        capability: "editor",
        required: true,
        file: "src/pages/edit.astro",
        reason: "conflict",
        message: "src/pages/edit.astro already exists.",
        instructions:
          "Render the Puck editor as a client-only island on a page of your choice.",
        snippet: ASTRO_EDITOR_PAGE,
      });
    }
    p.warn(
      "PUCK-CLI-W-STATIC-EDITOR",
      "Without an adapter, the editor is a static page at /edit?path=/your/page, and published pages aren't rendered by Astro. Re-run with --backend add to add @astrojs/node."
    );
  }

  if (mode === "none") {
    p.createFile("src/puck/pages.ts", LOCAL_PAGES_MODULE, {
      capability: "editor",
      summary: "Create src/puck/pages.ts (saves pages in the browser)",
    });
    p.warn(
      "PUCK-CLI-W-BROWSER-STORAGE",
      "Without a server, pages are saved in each browser's localStorage. Re-run with --backend add to store them on a server."
    );
  }

  if (mode === "external") {
    const url = p.backend?.url ?? "http://localhost:3000";
    const file = info.config ?? "astro.config.mjs";
    const result = info.config
      ? ensureConfigEntry(
          p.vfs.readText(p.abs(info.config)) ?? "",
          info.config,
          ["vite", "server", "proxy"],
          "/api",
          url
        )
      : ({
          status: "manual",
          detail: "no astro.config file was found",
        } as const);
    if (result.status === "inserted") {
      p.modifyFile(file, result.code, {
        capability: "editor",
        summary: `Proxy /api to ${url} in ${file}`,
        inserted: result.inserted,
      });
    } else if (result.status === "manual") {
      p.manual({
        id: "editor:proxy",
        type: "manual_edit",
        capability: "editor",
        required: true,
        file,
        reason: "unsupported_shape",
        message: `Couldn't proxy /api to ${url} automatically: ${result.detail}.`,
        instructions: `Proxy /api to ${url} in ${file}, so the editor can reach your server.`,
        snippet: `vite: {\n  server: {\n    proxy: {\n      "/api": "${url}",\n    },\n  },\n},`,
      });
    }
    p.warn(
      "PUCK-CLI-W-PROXY-PRODUCTION",
      `The dev server proxies /api to ${url}. In production, serve the site behind the same proxy.`
    );
  }

  planCoreDependency(p);
  p.warn(
    "PUCK-CLI-W-EDITOR-PUBLIC",
    "The editor route is public. Add authentication before deploying."
  );
};

export const planAstroCloudRoute = (
  p: Planner,
  _info: AstroInfo,
  withAi = false
) => {
  const aiRoute = templateText(p.templates, "astro-ai", CLOUD_ROUTE);
  const cloudRoute = withCloudHost(withoutAiOptions(aiRoute), p.cloudHost);
  const route = withAi ? withCloudHost(aiRoute, p.cloudHost) : cloudRoute;
  const existing = p.state.cloud.routeFile;

  if (existing) {
    if (withAi) planAiRoute(p, existing, cloudRoute, route, { warn: false });
    return;
  }

  const outcome = p.createFile(CLOUD_ROUTE, route, {
    capability: "cloud",
    summary: `Create ${CLOUD_ROUTE} (Puck Cloud API route)`,
  });
  if (outcome === "conflict") {
    p.manual({
      id: "cloud:route-conflict",
      type: "manual_edit",
      capability: "cloud",
      required: true,
      file: CLOUD_ROUTE,
      reason: "conflict",
      message: `${CLOUD_ROUTE} already exists and doesn't use puckHandler.`,
      instructions:
        "Serve Puck Cloud requests from /api/puck/* using puckHandler from @puckeditor/cloud-client.",
      snippet: route,
    });
  }
};

/** Adds Puck AI to an editor that was set up before */
export const planAstroAi = (p: Planner) => {
  const opts = astroRelocation(p);
  const upgrade = (file: string, summary: string) =>
    upgradeTemplateFile(p, {
      fromRecipe: "astro",
      toRecipe: "astro-ai",
      from: file,
      to: file,
      opts,
      capability: "ai",
      summary,
    });

  const editor = upgrade(
    "src/puck/editor.tsx",
    "Add the Puck AI plugin to src/puck/editor.tsx"
  );
  if (editor === "upgraded" || editor === "already") {
    upgrade(
      "src/puck/render.tsx",
      "Render AI-designed components in src/puck/render.tsx"
    );
    return;
  }

  const file = p.state.scan.editorFiles[0] ?? "src/puck/editor.tsx";
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

export const astroAdapter: FrameworkAdapter<AstroInfo> = {
  recipe: (withAi) => (withAi ? "astro-ai" : "astro"),
  recipeCloudRoute: CLOUD_ROUTE,
  appDir: () => "src",
  configDirs: () => ["", "src"],
  envDir: () => "",
  backend: (info) => ({
    existing: info.backend
      ? info.backend.mode === "local"
        ? { mode: "local" }
        : { mode: "external", url: info.backend.url ?? undefined }
      : null,
    addLabel:
      "Add the Node adapter (@astrojs/node), so Astro serves Puck's pages and APIs",
  }),
  detectCloudRoute: (info, _vfs, _root, scan) => ({
    expectedRouteFile: CLOUD_ROUTE,
    routeFile: findCloudRoute(scan, "src", CLOUD_ROUTE),
    routeRegistered: "n/a",
    external: info.backend?.mode === "external",
  }),
  planEditor: planAstroEditor,
  planCloudRoute: planAstroCloudRoute,
  planAi: (p) => planAstroAi(p),
  devUrl: "http://localhost:4321/edit",
  deployEnvWarning: `.env.local is only loaded in development. Set ${ENV_KEY} in the environment wherever the Astro server runs.`,
};
