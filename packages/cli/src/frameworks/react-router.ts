import path from "node:path";
import type { ReactRouterInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import { insertRoute, RouteEntry } from "../ast/react-router-routes";
import { ensureOptimizeDepsInclude } from "../ast/vite-optimize-deps";
import { REACT_ROUTER_CLOUD_ROUTE, withCloudHost } from "../templates/cloud";
import { CLOUD_ROUTE } from "../detect/state";
import { MANUAL_INTEGRATION_DOCS_URL } from "../constants";
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
} from "./shared";
import { AI_SNIPPET } from "./ai";

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

const CORE_PACKAGE = "@puckeditor/core";
const AI_PACKAGE = "@puckeditor/plugin-ai";

/**
 * Pre-bundles Puck so Vite doesn't discover it on the first request and
 * re-bundle mid-load, which leaves the page with two copies of react-router
 */
const planOptimizeDeps = (
  p: Planner,
  info: ReactRouterInfo,
  pkgs: string[],
  capability: CapabilityId
) => {
  const file = info.viteConfig ?? "vite.config.ts";
  const manual = (detail: string) =>
    p.manual({
      id: `${capability}:vite-optimize-deps`,
      type: "manual_edit",
      capability,
      required: false,
      file,
      reason: "unsupported_shape",
      message: `Couldn't add Puck to optimizeDeps.include automatically: ${detail}.`,
      instructions: `Add ${pkgs.join(
        " and "
      )} to optimizeDeps.include in ${file}, or the first page load after starting the dev server may crash while Vite re-bundles dependencies.`,
      snippet: `optimizeDeps: {\n  include: [${pkgs
        .map((pkg) => `"${pkg}"`)
        .join(", ")}],\n},`,
    });

  if (!info.viteConfig) return manual("no vite.config file was found");

  const code = p.vfs.readText(p.abs(info.viteConfig)) ?? "";
  const result = ensureOptimizeDepsInclude(code, info.viteConfig, pkgs);

  if (result.status === "exists") return;
  if (result.status === "manual")
    return manual(result.detail.replace(/\.$/, ""));

  p.modifyFile(info.viteConfig, result.code, {
    capability,
    summary: `Pre-bundle Puck in ${info.viteConfig}`,
    inserted: [{ at: result.at, text: result.text }],
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
    withAi ? [CORE_PACKAGE, AI_PACKAGE] : [CORE_PACKAGE],
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
  const entry = CLOUD_ROUTE.reactRouterEntry;
  const cloudRoute = withCloudHost(REACT_ROUTER_CLOUD_ROUTE, p.cloudHost);
  const route = withAi
    ? withCloudHost(
        templateText(p.templates, "react-router-ai", AI_ROUTE),
        p.cloudHost
      )
    : cloudRoute;
  let routeFile = p.state.cloud.routeFile;

  if (routeFile) {
    const current = p.vfs.readText(p.abs(routeFile));
    if (withAi && current === cloudRoute) {
      p.modifyFile(routeFile, route, {
        capability: "ai",
        summary: `Enable Puck AI in ${routeFile}`,
      });
    } else if (withAi && current !== route) {
      p.warn(
        "PUCK-CLI-W-AI-ROUTE",
        `Make sure the puckHandler in ${routeFile} sets ai.designMode.allowed to true, or Puck AI's design mode will be rejected.`
      );
    }
  } else {
    routeFile = CLOUD_ROUTE.reactRouter(info.appDir);
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
  const editor = upgradeTemplateFile(p, {
    fromRecipe: "react-router",
    toRecipe: "react-router-ai",
    from: "app/routes/puck-splat.tsx",
    to: `${A}/routes/puck-splat.tsx`,
    opts,
    capability: "ai",
    summary: `Add the Puck AI plugin to ${A}/routes/puck-splat.tsx`,
  });

  planOptimizeDeps(p, info, [CORE_PACKAGE, AI_PACKAGE], "ai");

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
