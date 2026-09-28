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
} from "./shared";
import { AI_SNIPPET } from "./ai";
import { planOptimizeDeps } from "./vite";
import { CORE_PACKAGE, PLUGIN_AI_PACKAGE } from "../constants";

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
  const module = (id: string) => to(`${id}.ts`).replace(/\.ts$/, "");
  return {
    moduleMap: {
      "src/lib/pages": module("src/lib/pages"),
      "src/lib/pages.server": module("src/lib/pages.server"),
      "src/lib/resolve-puck-path": module("src/lib/resolve-puck-path"),
      "src/components/puck-render": module("src/components/puck-render"),
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
    const current = p.vfs.readText(p.abs(existing));
    if (withAi && current === cloudRoute) {
      p.modifyFile(existing, route, {
        capability: "ai",
        summary: `Enable Puck AI in ${existing}`,
      });
    } else if (withAi && current !== route) {
      p.warn(
        "PUCK-CLI-W-AI-ROUTE",
        `Make sure the puckHandler in ${existing} sets ai.designMode.allowed to true, or Puck AI's design mode will be rejected.`
      );
    }
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

  const editor = upgrade(
    "src/routes/$.tsx",
    `Add the Puck AI plugin to ${to("src/routes/$.tsx")}`
  );

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
  devUrl: "http://localhost:3000/edit",
  deployEnvWarning:
    "Set PUCK_API_KEY in your hosting provider's environment variables before deploying.",
};
