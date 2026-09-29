import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { CliErrorPayload } from "../errors";
import { MANUAL_INTEGRATION_DOCS_URL } from "../constants";
import { findStringProperty } from "../ast/config-literal";
import { majorOf, resolveInstalledVersion, versionOf } from "./package-json";
import type { ServerRuntime } from "./server";
import {
  detectRuntime,
  findServerEntry,
  relativeImportExtension,
} from "./server";

export const FRAMEWORK_IDS = [
  "next",
  "react-router",
  "tanstack-start",
  "vinext",
  "vite",
  "astro",
  "hono",
  "express",
] as const;

export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  next: "Next.js",
  "react-router": "React Router",
  "tanstack-start": "TanStack Start",
  vinext: "vinext",
  vite: "Vite",
  astro: "Astro",
  hono: "Hono",
  express: "Express",
};

/** The oldest supported version of each framework, as "major" or "major.minor" */
export const MIN_VERSIONS: Record<FrameworkId, string> = {
  next: "15",
  "react-router": "7",
  // Server route handlers on createFileRoute arrived in the Start RC
  "tanstack-start": "1.132",
  // vinext 1.0 moved to Vite 8, which the recipe uses
  vinext: "1",
  // @hono/vite-dev-server is built and tested against Vite 6
  vite: "6",
  // @astrojs/node 11, which `astro add node` installs, needs Astro 7
  astro: "7",
  // @hono/node-server 2 needs Hono 4
  hono: "4",
  // express.json() arrived in 4.16
  express: "4.16",
};

/** For error messages, kept in sync with FRAMEWORK_IDS */
export const SUPPORTED_FRAMEWORKS =
  "Next.js (App Router), React Router 7 framework mode, TanStack Start, vinext, Astro and Vite React apps, or a Hono or Express server";

export interface NextInfo {
  id: "next";
  version: string | null;
  major: number | null;
  /** Project-relative App Router directory */
  appDir: "app" | "src/app";
  /** Directory containing app/, where proxy/middleware must live ("" or "src") */
  baseDir: "" | "src";
  proxyKind: "proxy" | "middleware";
}

export interface ReactRouterInfo {
  id: "react-router";
  version: string | null;
  major: number | null;
  appDir: string;
  routesFile: string | null;
  configFile: string | null;
  /** Project-relative directory Vite loads .env files from */
  envDir: string;
  viteConfig: string | null;
}

/** vinext runs the Next.js App Router API on Vite, so it shares Next's layout */
export interface VinextInfo extends Omit<NextInfo, "id"> {
  id: "vinext";
  viteConfig: string | null;
}

export type NextLikeInfo = NextInfo | VinextInfo;

export interface TanStackStartInfo {
  id: "tanstack-start";
  version: string | null;
  major: number | null;
  /** Project-relative source directory, `srcDirectory` in vite.config */
  srcDir: string;
  /** Project-relative file routes directory */
  routesDir: string;
  /** Project-relative directory Vite loads .env files from */
  envDir: string;
  viteConfig: string | null;
}

/** A client-only React app built with Vite */
export interface ViteInfo {
  id: "vite";
  version: string | null;
  major: number | null;
  viteConfig: string | null;
  /** Project-relative module that renders the app, e.g. src/main.tsx */
  entry: string | null;
  /** Project-relative directory the app's source lives in */
  srcDir: string;
  /** The server the app already uses for Puck, if any */
  backend: ExistingBackend | null;
}

export interface AstroInfo {
  id: "astro";
  version: string | null;
  major: number | null;
  config: string | null;
  /** @astrojs/react is installed, so React islands can render */
  react: boolean;
  /** The server adapter, e.g. @astrojs/node, which on-demand routes need */
  adapter: string | null;
  backend: ExistingBackend | null;
}

export type ExistingBackend =
  | { mode: "local" }
  | { mode: "external"; url: string | null };

/** A server that serves Puck's APIs for an editor elsewhere */
export interface ServerInfo<Id extends "hono" | "express"> {
  id: Id;
  version: string | null;
  major: number | null;
  /** Project-relative entry module that creates the app, if found */
  entry: string | null;
  /** ".js" when relative imports need an extension (module: nodenext) */
  importExtension: "" | ".js";
  runtime: ServerRuntime;
}

export type HonoInfo = ServerInfo<"hono">;
export type ExpressInfo = ServerInfo<"express">;

export type FrameworkInfo =
  | NextInfo
  | ReactRouterInfo
  | TanStackStartInfo
  | VinextInfo
  | ViteInfo
  | AstroInfo
  | HonoInfo
  | ExpressInfo;

export type FrameworkDetection =
  | { status: "detected"; info: FrameworkInfo }
  | { status: "unsupported"; error: CliErrorPayload }
  | { status: "none" };

/**
 * Refuses versions older than MIN_VERSIONS. Unknown versions, like "latest",
 * are allowed.
 */
const unsupportedVersion = (
  id: FrameworkId,
  version: string | null,
  range: string
): FrameworkDetection | null => {
  const found = versionOf(version) ?? versionOf(range);
  const [major, minor] = versionOf(MIN_VERSIONS[id])!;
  if (!found || found[0] > major || (found[0] === major && found[1] >= minor))
    return null;

  const label = FRAMEWORK_LABELS[id];
  return {
    status: "unsupported",
    error: {
      code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION",
      message: `${label} ${
        version ?? range
      } is not supported. Upgrade to ${label} ${
        MIN_VERSIONS[id]
      } or later, or integrate Puck manually.`,
      details: {
        docs: MANUAL_INTEGRATION_DOCS_URL,
        version: version ?? range,
        minVersion: MIN_VERSIONS[id],
      },
    },
  };
};

const firstExisting = (vfs: Vfs, root: string, candidates: string[]) =>
  candidates.find((c) => vfs.exists(path.join(root, c))) ?? null;

const CONFIG_EXTENSIONS = ["ts", "mts", "js", "mjs", "cts", "cjs"];

const findViteConfig = (vfs: Vfs, root: string) =>
  firstExisting(
    vfs,
    root,
    CONFIG_EXTENSIONS.map((ext) => `vite.config.${ext}`)
  );

const normalizeDir = (dir: string) =>
  path.posix
    .normalize(dir)
    .replace(/^\.\/?$/, "")
    .replace(/\/+$/, "");

const dynamicConfig = (file: string, what: string): FrameworkDetection => ({
  status: "unsupported",
  error: {
    code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
    message: `${file} sets ${what}`,
    details: { docs: MANUAL_INTEGRATION_DOCS_URL },
  },
});

/** Project-relative directory Vite loads .env files from */
const readEnvDir = (
  vfs: Vfs,
  root: string,
  viteConfig: string | null
): string | FrameworkDetection => {
  if (!viteConfig) return "";
  const lookup = findStringProperty(
    vfs.readText(path.join(root, viteConfig)) ?? "",
    viteConfig,
    "envDir"
  );
  if (lookup.status === "literal") return normalizeDir(lookup.value);
  if (lookup.status === "dynamic") {
    return dynamicConfig(
      viteConfig,
      "envDir dynamically, so the CLI can't tell where to write PUCK_API_KEY."
    );
  }
  return "";
};

const detectAppRouter = (
  vfs: Vfs,
  root: string,
  label: string
): Pick<NextInfo, "appDir" | "baseDir"> | FrameworkDetection => {
  const hasApp = vfs.isDir(path.join(root, "app"));
  const hasSrcApp = vfs.isDir(path.join(root, "src", "app"));

  if (!hasApp && !hasSrcApp) {
    const hasPages =
      vfs.isDir(path.join(root, "pages")) ||
      vfs.isDir(path.join(root, "src", "pages"));
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-ROUTER",
        message: hasPages
          ? `This ${label} project uses the Pages Router. The CLI can only integrate Puck with the App Router.`
          : `No app/ directory found. The CLI can only integrate Puck with the ${label} App Router.`,
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

  // Next.js resolves app/ before src/app/
  const appDir = hasApp ? "app" : "src/app";
  return { appDir, baseDir: appDir === "app" ? "" : "src" };
};

const detectNext = (
  vfs: Vfs,
  root: string,
  range: string
): FrameworkDetection => {
  const version = resolveInstalledVersion(vfs, root, "next");
  // Unknown ranges like "latest" or "canary" are treated as the newest major
  const major = majorOf(version) ?? majorOf(range) ?? 16;

  const layout = detectAppRouter(vfs, root, "Next.js");
  if ("status" in layout) return layout;

  const tooOld = unsupportedVersion("next", version, range);
  if (tooOld) return tooOld;

  return {
    status: "detected",
    info: {
      id: "next",
      version,
      major,
      ...layout,
      proxyKind: major >= 16 ? "proxy" : "middleware",
    },
  };
};

const detectVinext = (
  vfs: Vfs,
  root: string,
  range: string
): FrameworkDetection => {
  const version = resolveInstalledVersion(vfs, root, "vinext");
  const tooOld = unsupportedVersion("vinext", version, range);
  if (tooOld) return tooOld;

  const layout = detectAppRouter(vfs, root, "vinext");
  if ("status" in layout) return layout;

  // vinext supports both; keep an existing middleware file's convention
  const base = layout.baseDir ? `${layout.baseDir}/` : "";
  const hasMiddleware = ["ts", "js", "mjs", "tsx", "jsx"].some((ext) =>
    vfs.exists(path.join(root, `${base}middleware.${ext}`))
  );

  return {
    status: "detected",
    info: {
      id: "vinext",
      version,
      major: majorOf(version) ?? majorOf(range),
      ...layout,
      proxyKind: hasMiddleware ? "middleware" : "proxy",
      viteConfig: findViteConfig(vfs, root),
    },
  };
};

const detectReactRouter = (
  vfs: Vfs,
  root: string,
  range: string
): FrameworkDetection => {
  const version =
    resolveInstalledVersion(vfs, root, "@react-router/dev") ??
    resolveInstalledVersion(vfs, root, "react-router");
  const major = majorOf(version) ?? majorOf(range);

  const tooOld = unsupportedVersion("react-router", version, range);
  if (tooOld) return tooOld;

  const configFile = firstExisting(
    vfs,
    root,
    CONFIG_EXTENSIONS.map((ext) => `react-router.config.${ext}`)
  );

  let appDir = "app";
  if (configFile) {
    const lookup = findStringProperty(
      vfs.readText(path.join(root, configFile)) ?? "",
      configFile,
      "appDirectory"
    );
    if (lookup.status === "literal") {
      appDir = lookup.value.replace(/^\.\//, "").replace(/\/+$/, "");
    } else if (lookup.status === "dynamic") {
      return {
        status: "unsupported",
        error: {
          code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
          message: `${configFile} sets appDirectory dynamically, so the CLI can't locate your routes.`,
          details: { docs: MANUAL_INTEGRATION_DOCS_URL },
        },
      };
    }
  }

  const routesFile = firstExisting(
    vfs,
    root,
    ["ts", "tsx", "js", "jsx", "mts", "mjs"].map(
      (ext) => `${appDir}/routes.${ext}`
    )
  );

  if (!configFile && !routesFile) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
        message:
          "Found @react-router/dev but no react-router.config or app/routes file. The CLI supports React Router 7 framework mode.",
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

  const viteConfig = findViteConfig(vfs, root);
  const envDir = readEnvDir(vfs, root, viteConfig);
  if (typeof envDir !== "string") return envDir;

  return {
    status: "detected",
    info: {
      id: "react-router",
      version,
      major,
      appDir,
      routesFile,
      configFile,
      envDir,
      viteConfig,
    },
  };
};

const detectTanStackStart = (
  vfs: Vfs,
  root: string,
  range: string
): FrameworkDetection => {
  const version = resolveInstalledVersion(vfs, root, "@tanstack/react-start");
  const tooOld = unsupportedVersion("tanstack-start", version, range);
  if (tooOld) return tooOld;

  const viteConfig = findViteConfig(vfs, root);
  const code = viteConfig
    ? vfs.readText(path.join(root, viteConfig)) ?? ""
    : "";

  // Both default in the tanstackStart() Vite plugin options
  const dirs = { srcDirectory: "src", routesDirectory: "routes" };
  for (const key of Object.keys(dirs) as (keyof typeof dirs)[]) {
    if (!viteConfig) break;
    const lookup = findStringProperty(code, viteConfig, key);
    if (lookup.status === "literal") dirs[key] = normalizeDir(lookup.value);
    else if (lookup.status === "dynamic") {
      return dynamicConfig(
        viteConfig,
        `${key} dynamically, so the CLI can't locate your routes.`
      );
    }
  }

  const envDir = readEnvDir(vfs, root, viteConfig);
  if (typeof envDir !== "string") return envDir;

  const srcDir = dirs.srcDirectory;
  return {
    status: "detected",
    info: {
      id: "tanstack-start",
      version,
      major: majorOf(version) ?? majorOf(range),
      srcDir,
      routesDir: path.posix.join(srcDir || ".", dirs.routesDirectory),
      envDir,
      viteConfig,
    },
  };
};

const ENTRY_SCRIPT =
  /<script[^>]*type=["']module["'][^>]*src=["']\/?([^"']+)["']/;

/** Where a Vite app gets Puck's APIs: its own Hono dev server, or a proxy */
export const detectViteBackend = (
  code: string,
  file: string
): ExistingBackend | null => {
  if (code.includes("@hono/vite-dev-server")) return { mode: "local" };
  const proxy = findStringProperty(code, file, "/api");
  if (proxy.status === "literal") return { mode: "external", url: proxy.value };
  if (proxy.status === "dynamic") return { mode: "external", url: null };
  return null;
};

const detectVite = (
  vfs: Vfs,
  root: string,
  range: string,
  deps: Record<string, string>
): FrameworkDetection | null => {
  if (!("@vitejs/plugin-react" in deps || "@vitejs/plugin-react-swc" in deps))
    return null;

  const html = vfs.readText(path.join(root, "index.html")) ?? "";
  const scripted = html.match(ENTRY_SCRIPT)?.[1] ?? null;
  const entry =
    [scripted, "src/main.tsx", "src/main.jsx", "src/index.tsx"].find(
      (f): f is string => Boolean(f) && vfs.exists(path.join(root, f!))
    ) ?? null;

  const version = resolveInstalledVersion(vfs, root, "vite");
  const tooOld = unsupportedVersion("vite", version, range);
  if (tooOld) return tooOld;

  const viteConfig = findViteConfig(vfs, root);
  const code = viteConfig
    ? vfs.readText(path.join(root, viteConfig)) ?? ""
    : "";

  return {
    status: "detected",
    info: {
      id: "vite",
      version,
      major: majorOf(version) ?? majorOf(range),
      viteConfig,
      entry,
      srcDir: entry ? path.posix.dirname(entry).replace(/^\.$/, "") : "src",
      backend: viteConfig ? detectViteBackend(code, viteConfig) : null,
    },
  };
};

const ASTRO_ADAPTERS = [
  "@astrojs/node",
  "@astrojs/vercel",
  "@astrojs/netlify",
  "@astrojs/cloudflare",
  "@deno/astro-adapter",
];

const detectAstro = (
  vfs: Vfs,
  root: string,
  range: string,
  deps: Record<string, string>
): FrameworkDetection => {
  const version = resolveInstalledVersion(vfs, root, "astro");
  const tooOld = unsupportedVersion("astro", version, range);
  if (tooOld) return tooOld;

  const config = firstExisting(
    vfs,
    root,
    ["mjs", "ts", "js", "mts", "cjs"].map((ext) => `astro.config.${ext}`)
  );
  const adapter = ASTRO_ADAPTERS.find((a) => a in deps) ?? null;
  const code = config ? vfs.readText(path.join(root, config)) ?? "" : "";
  const proxy = config
    ? findStringProperty(code, config, "/api")
    : { status: "absent" as const };

  return {
    status: "detected",
    info: {
      id: "astro",
      version,
      major: majorOf(version) ?? majorOf(range),
      config,
      react: "@astrojs/react" in deps,
      adapter,
      backend: adapter
        ? { mode: "local" }
        : proxy.status === "literal"
        ? { mode: "external", url: proxy.value }
        : proxy.status === "dynamic"
        ? { mode: "external", url: null }
        : null,
    },
  };
};

const detectServer =
  (id: "hono" | "express") =>
  (
    vfs: Vfs,
    root: string,
    range: string,
    deps: Record<string, string>
  ): FrameworkDetection => {
    const version = resolveInstalledVersion(vfs, root, id);
    const tooOld = unsupportedVersion(id, version, range);
    if (tooOld) return tooOld;

    return {
      status: "detected",
      info: {
        id,
        version,
        major: majorOf(version) ?? majorOf(range),
        entry: findServerEntry(vfs, root),
        importExtension: relativeImportExtension(vfs, root),
        runtime: detectRuntime(vfs, root, deps),
      },
    };
  };

interface Detector {
  id: FrameworkId;
  /** The package whose presence marks the framework */
  dep: string;
  /** Frameworks this one runs on top of or replaces, e.g. vinext over next */
  supersedes?: FrameworkId[];
  /** Only used when no other framework is found, e.g. a server next to a React app */
  fallback?: boolean;
  /** null when the dependency is there but it isn't this framework */
  detect: (
    vfs: Vfs,
    root: string,
    range: string,
    deps: Record<string, string>
  ) => FrameworkDetection | null;
}

const DETECTORS: Detector[] = [
  { id: "next", dep: "next", detect: detectNext },
  {
    id: "react-router",
    dep: "@react-router/dev",
    supersedes: ["vite"],
    detect: detectReactRouter,
  },
  {
    id: "tanstack-start",
    dep: "@tanstack/react-start",
    supersedes: ["vite"],
    detect: detectTanStackStart,
  },
  // Projects migrating to vinext usually keep next installed
  {
    id: "vinext",
    dep: "vinext",
    supersedes: ["next", "vite"],
    detect: detectVinext,
  },
  { id: "vite", dep: "vite", detect: detectVite },
  { id: "astro", dep: "astro", supersedes: ["vite"], detect: detectAstro },
  { id: "hono", dep: "hono", fallback: true, detect: detectServer("hono") },
  {
    id: "express",
    dep: "express",
    fallback: true,
    detect: detectServer("express"),
  },
];

export const detectFramework = (
  vfs: Vfs,
  root: string,
  deps: Record<string, string>
): FrameworkDetection => {
  const present = DETECTORS.filter(
    (d) =>
      d.dep in deps &&
      // e.g. Vite without its React plugin isn't a Vite React app
      (d.id !== "vite" || detectVite(vfs, root, deps[d.dep], deps) !== null)
  );
  const superseded = present.flatMap((d) => d.supersedes ?? []);
  const primary = present.filter((d) => !d.fallback);
  const matches = (primary.length ? primary : present).filter(
    (d) => !superseded.includes(d.id)
  );

  if (matches.length > 1) {
    const [a, b] = matches.map((d) => FRAMEWORK_LABELS[d.id]);
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-AMBIGUOUS-FRAMEWORK",
        message: `Both ${a} and ${b} are installed, so the CLI can't tell which one to integrate with.`,
      },
    };
  }

  if (matches.length === 1) {
    const [match] = matches;
    return match.detect(vfs, root, deps[match.dep], deps)!;
  }

  const remix = Object.keys(deps).find((d) => d.startsWith("@remix-run/"));
  if (remix) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
        message:
          "Remix is not supported. Upgrade to React Router 7 framework mode, or integrate Puck manually.",
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

  if ("react-router" in deps || "react-router-dom" in deps) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
        message: `React Router is used as a library (no @react-router/dev). The CLI supports ${SUPPORTED_FRAMEWORKS}.`,
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

  if ("react" in deps) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
        message: `Found a React project without a supported framework. The CLI supports ${SUPPORTED_FRAMEWORKS}.`,
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

  return { status: "none" };
};
