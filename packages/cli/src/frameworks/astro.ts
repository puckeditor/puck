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
  ASTRO_PAGES_API,
  ASTRO_PAGES_CATCH_ALL,
  astroPagesEditorPage,
  astroPagesLib,
  vitePagesEditor,
} from "../templates/pages";
import { astroPuckAuth } from "../templates/auth";
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

  const editor = upgradeVariant(p, {
    ...editorVariants(p),
    want: { ai: true },
    capability: "ai",
    summary: `Add the Puck AI plugin to ${EDITOR}`,
  });
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

const EDITOR = "src/puck/editor.tsx";
const CATCH_ALL_PAGE = "src/pages/[...puckPath].astro";
const PAGES_EDITOR = "src/pages/puck.astro";
const PAGES_LIB = "src/lib/pages.ts";
const PAGES_API = "src/pages/api/pages.ts";

type Flags = { ai: boolean; pages: boolean; auth: boolean };

/** Every version of editor.tsx the CLI writes */
const editorVariants = (p: Planner) => ({
  from: EDITOR,
  to: EDITOR,
  opts: astroRelocation(p),
  combos: flagCombos("ai", "pages", "auth"),
  source: ({ ai, pages, auth }: Flags) => {
    const code = pages
      ? vitePagesEditor({ ai })
      : templateText(p.templates, ai ? "astro-ai" : "astro", EDITOR);
    return auth ? withAuthPlugin(code, EDITOR) : code;
  },
});

/** Gates the recipe's editor behind Sign in with Puck */
const gateRecipeCatchAll = (code: string) => {
  const resolved =
    "const { isEditorRoute, path } = resolvePuckPath(Astro.url.pathname);";
  return code
    .replace(
      resolved,
      `${resolved}

// Editing requires Sign in with Puck
const signIn = isEditorRoute ? await puckSignInUrl(Astro.request) : null;
if (signIn) return Astro.redirect(signIn);
`
    )
    .replace(
      'import { getPage } from "../lib/pages";',
      'import { getPage } from "../lib/pages";\nimport { puckSignInUrl } from "../lib/puck-auth";'
    );
};

/** Every version of [...puckPath].astro the CLI writes */
const catchAllVariants = (p: Planner) => ({
  from: CATCH_ALL_PAGE,
  to: CATCH_ALL_PAGE,
  opts: astroRelocation(p),
  combos: flagCombos("pages", "auth"),
  source: ({ pages, auth }: Omit<Flags, "ai">) => {
    // With Pages, the editor is in puck.astro
    if (pages) return ASTRO_PAGES_CATCH_ALL;
    const code = templateText(p.templates, "astro", CATCH_ALL_PAGE);
    return auth ? gateRecipeCatchAll(code) : code;
  },
});

/** Every version of the Pages editor page, puck.astro */
const pagesEditorVariants = (p: Planner, server: boolean) => ({
  from: PAGES_EDITOR,
  to: PAGES_EDITOR,
  opts: astroRelocation(p),
  combos: flagCombos("auth"),
  source: ({ auth }: { auth: boolean }) =>
    astroPagesEditorPage({ server, auth }),
});

/** Edits at /puck with the Pages plugin, and renders published pages */
export const planAstroPages = (p: Planner, info: AstroInfo) => {
  const mode = modeOf(p, info);
  const onServer = mode === "local" || mode === "add";
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
  const ok = (outcome: string) =>
    outcome === "upgraded" || outcome === "already";
  const want = { pages: true };

  if (
    !ok(
      upgradeVariant(p, {
        ...editorVariants(p),
        want,
        capability: "pages",
        summary: `Add the Puck Pages plugin to ${EDITOR}`,
      })
    )
  )
    manual(EDITOR, vitePagesEditor({ ai: false }));

  let auth = false;
  if (onServer) {
    const catchAll = upgradeVariant(p, {
      ...catchAllVariants(p),
      want,
      capability: "pages",
      summary: `Render pages published in Puck Cloud in ${CATCH_ALL_PAGE}`,
      onMatch: (flags) => (auth = flags.auth),
    });
    if (!ok(catchAll)) manual(CATCH_ALL_PAGE, ASTRO_PAGES_CATCH_ALL);

    // The recipe's /api/pages saves pages with lib/pages.ts, so it changes first
    const api = upgradeVariant(p, {
      from: PAGES_API,
      to: PAGES_API,
      opts: astroRelocation(p),
      combos: [{ pages: false }, { pages: true }],
      source: ({ pages }) =>
        pages ? ASTRO_PAGES_API : templateText(p.templates, "astro", PAGES_API),
      want,
      capability: "pages",
      summary: `Serve pages published in Puck Cloud from ${PAGES_API}`,
    });
    if (ok(api) || api === "missing") {
      const lib = upgradeVariant(p, {
        from: PAGES_LIB,
        to: PAGES_LIB,
        opts: astroRelocation(p),
        combos: [{ pages: false }, { pages: true }],
        source: ({ pages }) =>
          pages
            ? astroPagesLib(p.cloudHost)
            : templateText(p.templates, "astro", PAGES_LIB),
        want,
        capability: "pages",
        summary: `Read published pages from Puck Cloud in ${PAGES_LIB}`,
      });
      if (!ok(lib)) manual(PAGES_LIB, astroPagesLib(p.cloudHost));
    } else {
      manual(PAGES_API, ASTRO_PAGES_API);
      manual(PAGES_LIB, astroPagesLib(p.cloudHost));
    }

    planRouteAuth(p, "unowned", "pages");
    warnLocalPages(p);
  } else {
    p.warn(
      "PUCK-CLI-W-EXTERNAL-PAGES",
      `Pages are loaded from ${
        p.backend?.url ?? "the server /api is proxied to"
      }. Run \`npx @puckeditor/cli add pages\` in that server's project, so /api/pages serves pages published in Puck Cloud.`
    );
  }

  const page = astroPagesEditorPage({ server: onServer, auth });
  if (
    p.createFile(PAGES_EDITOR, page, {
      capability: "pages",
      summary: `Create ${PAGES_EDITOR} (the Puck Pages editor)`,
    }) === "conflict"
  )
    manual(PAGES_EDITOR, page);
};

/** Requires Sign in with Puck to edit, and for the Cloud route */
export const planAstroAuth = (p: Planner, info: AstroInfo) => {
  const mode = modeOf(p, info);
  const onServer = mode === "local" || mode === "add";

  if (onServer) {
    const helper = "src/lib/puck-auth.ts";
    if (
      p.createFile(helper, astroPuckAuth(p.cloudHost), {
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
        instructions: `Export puckSignInUrl from ${helper}, or move your file and re-run the command.`,
        snippet: astroPuckAuth(p.cloudHost),
      });
    }

    // With Pages, the editor is its own page
    const pagesEditor = p.vfs.exists(p.abs(PAGES_EDITOR));
    const upgrade = {
      want: { auth: true },
      capability: "auth" as const,
      summary: `Require Sign in with Puck in ${
        pagesEditor ? PAGES_EDITOR : CATCH_ALL_PAGE
      }`,
    };
    const gate = pagesEditor
      ? upgradeVariant(p, { ...pagesEditorVariants(p, true), ...upgrade })
      : upgradeVariant(p, { ...catchAllVariants(p), ...upgrade });
    if (gate === "customized" || gate === "missing") {
      p.manual({
        id: "auth:editor-gate",
        type: "manual_edit",
        capability: "auth",
        required: false,
        file: pagesEditor ? PAGES_EDITOR : CATCH_ALL_PAGE,
        reason: "unsupported_shape",
        message:
          "Your editor page was customised, so it doesn't send signed-out visitors to sign in.",
        instructions:
          "Redirect to puckSignInUrl in the frontmatter of the page that renders your editor. The Puck Cloud API route already requires Sign in with Puck.",
        snippet: `import { puckSignInUrl } from "../lib/puck-auth";\n\nconst signIn = await puckSignInUrl(Astro.request);\nif (signIn) return Astro.redirect(signIn);\n`,
      });
    }
    planRouteAuth(p, "puckAuth", "auth");
  } else {
    p.warn(
      "PUCK-CLI-W-EXTERNAL-AUTH",
      `Puck Cloud requests go to ${
        p.backend?.url ?? "the server /api is proxied to"
      }. Run \`npx @puckeditor/cli add auth\` in that server's project to require Sign in with Puck there.`
    );
  }

  planAuthPlugin(p, EDITOR);
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
  planPages: planAstroPages,
  planAuth: planAstroAuth,
  devUrl: "http://localhost:4321/edit",
  deployEnvWarning: `.env.local is only loaded in development. Set ${ENV_KEY} in the environment wherever the Astro server runs.`,
};
