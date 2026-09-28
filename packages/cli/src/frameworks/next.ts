import type { NextLikeInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import { parseModule } from "../ast/parse";
import { applyEdits } from "../ast/splice";
import { templateText } from "../templates/source";
import { NEXT_CLOUD_ROUTE, withCloudHost } from "../templates/cloud";
import type { FrameworkAdapter } from "./adapter";
import { findCloudRoute } from "./adapter";
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
import { AI_SNIPPET, RENDER_AI_SNIPPET } from "./ai";

export const NEXT_CLOUD_ROUTE_FILE = (appDir: string) =>
  `${appDir}/api/puck/[...all]/route.ts`;

const PROXY_FILES = ["proxy", "middleware"].flatMap((name) =>
  ["ts", "js", "mjs", "tsx", "jsx"].map((ext) => `${name}.${ext}`)
);

/** Every recipe file must be mapped or deliberately excluded */
export const NEXT_EDITOR_EXCLUDED = [
  ".gitignore",
  "README.md",
  "app/favicon.ico",
  "app/layout.tsx",
  "app/styles.css",
  "next.config.js",
  "package.json",
  "tsconfig.json",
  "tsconfig/base.json",
  "tsconfig/nextjs.json",
];

export const NEXT_EDITOR_MAPPED = [
  "app/[...puckPath]/client.tsx",
  "app/[...puckPath]/page.tsx",
  "app/page.tsx",
  "app/puck/[...puckPath]/client.tsx",
  "app/puck/[...puckPath]/page.tsx",
  "app/puck/api/route.ts",
  "app/puck/page.tsx",
  "database.json",
  "lib/get-page.ts",
  "proxy.ts",
  "puck.config.tsx",
];

export const NEXT_AI_EDITOR_EXCLUDED = [
  ".gitignore",
  "README.md",
  "app/layout.tsx",
  "app/styles.css",
  "next.config.js",
  "package.json",
  "public/favicon.ico",
  "tsconfig.json",
  "tsconfig/base.json",
  "tsconfig/nextjs.json",
];

export const NEXT_AI_EDITOR_MAPPED = [
  "app/[...puckPath]/client.tsx",
  "app/[...puckPath]/page.tsx",
  "app/api/pages/route.ts",
  "app/api/puck/[...all]/route.ts",
  "app/page.tsx",
  "app/puck/[...puckPath]/client.tsx",
  "app/puck/[...puckPath]/page.tsx",
  "app/puck/page.tsx",
  "database.json",
  "lib/get-page.ts",
  "proxy.ts",
  "puck.config.tsx",
];

const NEXT_AI_ROUTE = "app/api/puck/[...all]/route.ts";

/** Recipe module ids → project module ids for a Next.js app */
const nextRelocation = (p: Planner, info: NextLikeInfo): RelocateContext => {
  const A = info.appDir;
  const lib = `${info.baseDir ? `${info.baseDir}/` : ""}lib`;
  return {
    moduleMap: {
      "app/[...puckPath]/page": `${A}/[...puckPath]/page`,
      "app/[...puckPath]/client": `${A}/[...puckPath]/client`,
      "app/puck/[...puckPath]/page": `${A}/puck/[...puckPath]/page`,
      "app/puck/[...puckPath]/client": `${A}/puck/[...puckPath]/client`,
      "app/page": `${A}/page`,
      "lib/get-page": `${lib}/get-page`,
      "puck.config": configModuleTarget(p),
    },
    config: configRelocation(p),
  };
};

/** Top-level dynamic segments that would clash with a root catch-all */
const conflictingSegments = (p: Planner, appDir: string) => {
  const found: string[] = [];
  const visit = (dir: string, depth: number) => {
    for (const entry of p.vfs.list(p.abs(dir))) {
      if (!entry.isDir) continue;
      if (/^\(.+\)$/.test(entry.name) && depth === 0)
        visit(`${dir}/${entry.name}`, depth + 1);
      else if (/^\[.+\]$/.test(entry.name) && entry.name !== "[...puckPath]")
        found.push(`${dir}/${entry.name}`);
    }
  };
  visit(appDir, 0);
  return found;
};

const proxySource = (p: Planner, info: NextLikeInfo) => {
  const code = templateText(p.templates, "next", "proxy.ts");
  if (info.proxyKind === "proxy") return code;

  // Next.js 15 calls the same file middleware.ts with a `middleware` export
  const ast = parseModule(code, "proxy.ts");
  for (const statement of ast.program.body) {
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : null;
    if (decl?.type === "FunctionDeclaration" && decl.id?.name === "proxy") {
      return applyEdits(code, [
        { start: decl.id.start!, end: decl.id.end!, text: "middleware" },
      ]);
    }
  }
  return code;
};

export const planNextEditor = (
  p: Planner,
  info: NextLikeInfo,
  withAi = false
) => {
  const A = info.appDir;
  const base = info.baseDir ? `${info.baseDir}/` : "";
  const lib = `${base}lib`;
  const recipe = withAi ? "next-ai" : "next";

  const files: TemplateFile[] = [
    { from: "app/puck/page.tsx", to: `${A}/puck/page.tsx` },
    {
      from: "app/puck/[...puckPath]/page.tsx",
      to: `${A}/puck/[...puckPath]/page.tsx`,
    },
    {
      from: "app/puck/[...puckPath]/client.tsx",
      to: `${A}/puck/[...puckPath]/client.tsx`,
    },
    // The AI recipe saves pages from /api/pages, next to the Cloud route
    withAi
      ? { from: "app/api/pages/route.ts", to: `${A}/api/pages/route.ts` }
      : { from: "app/puck/api/route.ts", to: `${A}/puck/api/route.ts` },
    { from: "lib/get-page.ts", to: `${lib}/get-page.ts` },
    { from: "database.json", to: "database.json", ifMissing: true },
  ];

  const conflicts = conflictingSegments(p, A);
  if (conflicts.length > 0) {
    p.manual({
      id: "editor:next-catch-all",
      type: "manual_edit",
      capability: "editor",
      required: false,
      file: `${A}/[...puckPath]/page.tsx`,
      reason: "conflict",
      message: `Skipped the public page route because ${conflicts.join(
        ", "
      )} already handles top-level paths.`,
      instructions:
        "Puck pages can still be edited at /edit, but won't be rendered publicly until you render them with <Render> in your existing route.",
    });
  } else {
    files.push(
      { from: "app/[...puckPath]/page.tsx", to: `${A}/[...puckPath]/page.tsx` },
      {
        from: "app/[...puckPath]/client.tsx",
        to: `${A}/[...puckPath]/client.tsx`,
      }
    );
    const homeExists = ["tsx", "ts", "jsx", "js"].some((ext) =>
      p.vfs.exists(p.abs(`${A}/page.${ext}`))
    );
    if (homeExists) {
      p.warn(
        "PUCK-CLI-W-HOME-NOT-MANAGED",
        `Your existing ${A}/page is kept, so the home page isn't managed by Puck.`
      );
    } else {
      files.push({ from: "app/page.tsx", to: `${A}/page.tsx` });
    }
  }

  planPuckConfig(p, recipe);
  copyTemplateFiles(p, recipe, files, nextRelocation(p, info));

  const proxyDir = info.baseDir;
  const existingProxy = PROXY_FILES.flatMap((f) => [f, `src/${f}`]).find((f) =>
    p.vfs.exists(p.abs(f))
  );
  const proxyName = `${info.proxyKind}.ts`;
  const proxyRel = proxyDir ? `${proxyDir}/${proxyName}` : proxyName;

  if (existingProxy) {
    p.manual({
      id: "editor:next-proxy",
      type: "manual_edit",
      capability: "editor",
      required: false,
      file: existingProxy,
      reason: "optional",
      message: `${existingProxy} already exists, so the /edit rewrite wasn't added. The editor is available at /puck/<path> until you add it.`,
      instructions: `Add this rewrite to ${existingProxy} so that visiting any page with /edit opens the editor.`,
      snippet: proxySource(p, info),
    });
  } else {
    p.createFile(proxyRel, proxySource(p, info), {
      capability: "editor",
      summary: `Create ${proxyRel} (rewrites /<path>/edit to the editor)`,
    });
  }

  planCoreDependency(p);
  p.warn(
    "PUCK-CLI-W-EDITOR-PUBLIC",
    "The editor route is public. Add authentication before deploying."
  );
};

export const planNextCloudRoute = (
  p: Planner,
  info: NextLikeInfo,
  withAi = false
) => {
  const rel = NEXT_CLOUD_ROUTE_FILE(info.appDir);
  const cloudRoute = withCloudHost(NEXT_CLOUD_ROUTE, p.cloudHost);
  const route = withAi
    ? withCloudHost(
        templateText(p.templates, "next-ai", NEXT_AI_ROUTE),
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
      instructions: `Serve Puck Cloud requests from /api/puck/* using puckHandler from @puckeditor/cloud-client.`,
      snippet: route,
    });
  }
};

/** Adds Puck AI to an editor that was set up before, by the CLI or by hand */
export const planNextAi = (p: Planner, info: NextLikeInfo) => {
  const A = info.appDir;
  const opts = nextRelocation(p, info);
  const upgrade = (from: string, summary: string) =>
    upgradeTemplateFile(p, {
      fromRecipe: "next",
      toRecipe: "next-ai",
      from,
      to: from.replace(/^app\//, `${A}/`),
      opts,
      capability: "ai",
      summary,
    });

  const editor = upgrade(
    "app/puck/[...puckPath]/client.tsx",
    `Add the Puck AI plugin to ${A}/puck/[...puckPath]/client.tsx`
  );
  upgrade(
    "app/puck/[...puckPath]/page.tsx",
    `Load Puck AI styles in ${A}/puck/[...puckPath]/page.tsx`
  );
  const render = upgrade(
    "app/[...puckPath]/client.tsx",
    `Render AI-designed components in ${A}/[...puckPath]/client.tsx`
  );

  if (editor === "upgraded" || editor === "already") {
    // The AI editor saves to /api/pages
    copyTemplateFiles(
      p,
      "next-ai",
      [{ from: "app/api/pages/route.ts", to: `${A}/api/pages/route.ts` }],
      opts,
      "ai"
    );
  } else {
    const file =
      p.state.scan.editorFiles[0] ?? `${A}/puck/[...puckPath]/client.tsx`;
    p.manual({
      id: "ai:editor",
      type: "manual_edit",
      capability: "ai",
      required: true,
      file,
      reason: "unsupported_shape",
      message: `${file} was customised, so the Puck AI plugin wasn't added automatically.`,
      instructions: `Add the Puck AI plugin to the <Puck> editor in ${file}, and import "@puckeditor/plugin-ai/styles.css" alongside "@puckeditor/core/puck.css".`,
      snippet: AI_SNIPPET,
    });
  }

  if (render === "customized") {
    p.manual({
      id: "ai:render",
      type: "manual_edit",
      capability: "ai",
      required: false,
      file: `${A}/[...puckPath]/client.tsx`,
      reason: "optional",
      message:
        "Wrap your config with withDynamicConfig where you render Puck pages, so components designed by Puck AI render too.",
      instructions:
        "Pass withDynamicConfig(config, data) to <Render> instead of config.",
      snippet: RENDER_AI_SNIPPET,
    });
  }
};

export const nextAdapter: FrameworkAdapter<NextLikeInfo> = {
  recipe: (withAi) => (withAi ? "next-ai" : "next"),
  recipeCloudRoute: NEXT_CLOUD_ROUTE_FILE("app"),
  appDir: (info) => info.appDir,
  configDirs: () => ["", "src"],
  envDir: () => "",
  detectCloudRoute: (info, _vfs, _root, scan) => {
    const expectedRouteFile = NEXT_CLOUD_ROUTE_FILE(info.appDir);
    return {
      expectedRouteFile,
      routeFile: findCloudRoute(scan, info.appDir, expectedRouteFile),
      routeRegistered: "n/a",
    };
  },
  planEditor: planNextEditor,
  planCloudRoute: planNextCloudRoute,
  planAi: planNextAi,
  devUrl: "http://localhost:3000/edit",
  deployEnvWarning:
    "Set PUCK_API_KEY in your hosting provider's environment variables before deploying.",
};
