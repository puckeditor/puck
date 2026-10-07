import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { ProjectContext } from "./project";
import type { CapabilityId } from "../result";
import {
  CLOUD_CLIENT_PACKAGE,
  CORE_PACKAGE,
  LEGACY_CORE_PACKAGE,
  PLUGIN_AI_PACKAGE,
} from "../constants";
import { resolveInstalledVersion } from "./package-json";
import { scanSources, SourceScan, toPosix } from "./scan";
import { tryParseModule } from "../ast/parse";
import { ExportShape, getExportShape } from "../ast/exports";
import { adapterFor } from "../frameworks";
import type { PagesApiDetection } from "../frameworks/adapter";
import { findApiKey, KeyLocation } from "../env/files";
import { isIgnored } from "../env/gitignore";

export const CONFIG_CANDIDATES = ["tsx", "ts", "jsx", "js"].map(
  (ext) => `puck.config.${ext}`
);

export interface ProjectState {
  /** "server" when the project only serves Puck's APIs, e.g. Hono or Express */
  target: "app" | "server";
  /** The pages API a server exposes in place of an editor */
  pagesApi: PagesApiDetection | null;
  scan: SourceScan;
  puck: {
    installed: boolean;
    legacy: boolean;
    declaredRange: string | null;
    resolvedVersion: string | null;
    /** Project-relative */
    configFile: string | null;
    configExports: ExportShape | null;
  };
  cloud: {
    clientInstalled: boolean;
    declaredRange: string | null;
    routeFile: string | null;
    expectedRouteFile: string | null;
    routeRegistered: boolean | "n/a";
    /** The Cloud route is served by another server the app proxies to */
    external: boolean;
    /** Absolute directory env files are loaded from */
    envDir: string;
    apiKey: KeyLocation;
    envGitignored: boolean | null;
  };
  ai: {
    installed: boolean;
    declaredRange: string | null;
  };
}

const findConfig = (vfs: Vfs, ctx: ProjectContext, configFlag?: string) => {
  if (configFlag) {
    const abs = path.resolve(ctx.cwd, configFlag);
    return vfs.exists(abs) ? toPosix(path.relative(ctx.root, abs)) : null;
  }

  const dirs = ctx.framework
    ? adapterFor(ctx.framework).configDirs(ctx.framework)
    : ["", "src"];

  for (const dir of dirs) {
    for (const candidate of CONFIG_CANDIDATES) {
      const rel = dir ? `${dir}/${candidate}` : candidate;
      if (vfs.exists(path.join(ctx.root, rel))) return rel;
    }
  }
  return null;
};

export const envDirFor = (ctx: ProjectContext) =>
  ctx.framework
    ? path.join(ctx.root, adapterFor(ctx.framework).envDir(ctx.framework))
    : ctx.root;

export const detectState = (
  vfs: Vfs,
  ctx: ProjectContext,
  env: Record<string, string | undefined>,
  opts: { configFlag?: string } = {}
): ProjectState => {
  const scan = scanSources(vfs, ctx.root);

  const configFile = findConfig(vfs, ctx, opts.configFlag);
  let configExports: ExportShape | null = null;
  if (configFile) {
    const code = vfs.readText(path.join(ctx.root, configFile));
    const ast = code ? tryParseModule(code, configFile) : null;
    configExports = ast ? getExportShape(ast) : null;
  }

  const adapter = ctx.framework ? adapterFor(ctx.framework) : null;
  const route = ctx.framework
    ? adapterFor(ctx.framework).detectCloudRoute(
        ctx.framework,
        vfs,
        ctx.root,
        scan
      )
    : null;

  const envDir = envDirFor(ctx);
  const apiKey = findApiKey(vfs, envDir, env);
  const gitignoreRoot = ctx.gitRoot ?? ctx.workspace?.root ?? ctx.root;

  return {
    target: adapter?.kind === "server" ? "server" : "app",
    pagesApi:
      ctx.framework && adapter?.detectPagesApi
        ? adapter.detectPagesApi(ctx.framework, vfs, ctx.root)
        : null,
    scan,
    puck: {
      installed: CORE_PACKAGE in ctx.deps,
      legacy: LEGACY_CORE_PACKAGE in ctx.deps,
      declaredRange: ctx.deps[CORE_PACKAGE] ?? null,
      resolvedVersion: resolveInstalledVersion(vfs, ctx.root, CORE_PACKAGE),
      configFile,
      configExports,
    },
    cloud: {
      clientInstalled: CLOUD_CLIENT_PACKAGE in ctx.deps,
      declaredRange: ctx.deps[CLOUD_CLIENT_PACKAGE] ?? null,
      routeFile: route?.routeFile ?? null,
      expectedRouteFile: route?.expectedRouteFile ?? null,
      routeRegistered: route?.routeRegistered ?? "n/a",
      external: Boolean(route?.external),
      envDir,
      apiKey,
      envGitignored: apiKey.file
        ? isIgnored(vfs, apiKey.file, gitignoreRoot)
        : null,
    },
    ai: {
      installed: PLUGIN_AI_PACKAGE in ctx.deps,
      declaredRange: ctx.deps[PLUGIN_AI_PACKAGE] ?? null,
    },
  };
};

export const capabilityStatus = (
  state: ProjectState
): Record<CapabilityId, { satisfied: boolean; missing: string[] }> => {
  const editorMissing: string[] = [];
  if (state.target === "server") {
    if (!state.pagesApi) editorMissing.push("No Puck pages API found");
    else if (!state.pagesApi.mounted)
      editorMissing.push(`${state.pagesApi.file} isn't mounted on the app`);
  } else {
    if (!state.puck.installed)
      editorMissing.push(`${CORE_PACKAGE} is not installed`);
    if (state.scan.editorFiles.length === 0)
      editorMissing.push("No Puck editor found");
  }

  const cloudMissing: string[] = [];
  // Otherwise it's set up on the server the app proxies to
  if (!state.cloud.external) {
    if (!state.cloud.clientInstalled)
      cloudMissing.push(`${CLOUD_CLIENT_PACKAGE} is not installed`);
    if (!state.cloud.routeFile)
      cloudMissing.push("No Puck Cloud API route found");
    if (state.cloud.routeRegistered === false)
      cloudMissing.push(
        state.target === "server"
          ? "The Puck Cloud API route isn't mounted on the app"
          : "The Puck Cloud API route isn't registered in routes.ts"
      );
    if (!state.cloud.apiKey.present)
      cloudMissing.push("PUCK_API_KEY is not set");
  }

  // A server only enables AI in its Cloud route; the plugin is in the editor
  const aiMissing: string[] =
    state.target === "server" ? [...cloudMissing] : [];
  if (state.target === "app") {
    if (!state.ai.installed)
      aiMissing.push(`${PLUGIN_AI_PACKAGE} is not installed`);
    if (state.scan.aiPluginFiles.length === 0)
      aiMissing.push("The Puck AI plugin isn't added to the editor");
  }

  return {
    editor: { satisfied: editorMissing.length === 0, missing: editorMissing },
    cloud: { satisfied: cloudMissing.length === 0, missing: cloudMissing },
    ai: { satisfied: aiMissing.length === 0, missing: aiMissing },
  };
};
