import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { CliErrorPayload } from "../errors";
import { MANUAL_INTEGRATION_DOCS_URL } from "../constants";
import { findStringProperty } from "../ast/config-literal";
import { majorOf, resolveInstalledVersion } from "./package-json";

export const FRAMEWORK_IDS = ["next", "react-router", "vinext"] as const;

export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  next: "Next.js",
  "react-router": "React Router",
  vinext: "vinext",
};

/** For error messages, kept in sync with FRAMEWORK_IDS */
export const SUPPORTED_FRAMEWORKS =
  "Next.js (App Router), React Router 7 framework mode and vinext";

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

export type FrameworkInfo = NextInfo | ReactRouterInfo | VinextInfo;

export type FrameworkDetection =
  | { status: "detected"; info: FrameworkInfo }
  | { status: "unsupported"; error: CliErrorPayload }
  | { status: "none" };

const firstExisting = (vfs: Vfs, root: string, candidates: string[]) =>
  candidates.find((c) => vfs.exists(path.join(root, c))) ?? null;

const CONFIG_EXTENSIONS = ["ts", "mts", "js", "mjs", "cts", "cjs"];

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

  if (major < 15) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION",
        message: `Next.js ${
          version ?? range
        } is not supported. Upgrade to Next.js 15 or later, or integrate Puck manually.`,
        details: {
          docs: MANUAL_INTEGRATION_DOCS_URL,
          version: version ?? range,
        },
      },
    };
  }

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
      viteConfig: firstExisting(
        vfs,
        root,
        CONFIG_EXTENSIONS.map((ext) => `vite.config.${ext}`)
      ),
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

  if (major !== null && major < 7) {
    return {
      status: "unsupported",
      error: {
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION",
        message: `React Router ${
          version ?? range
        } is not supported. Upgrade to React Router 7 framework mode.`,
        details: { docs: MANUAL_INTEGRATION_DOCS_URL },
      },
    };
  }

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

  let envDir = "";
  const viteConfig = firstExisting(
    vfs,
    root,
    CONFIG_EXTENSIONS.map((ext) => `vite.config.${ext}`)
  );
  if (viteConfig) {
    const lookup = findStringProperty(
      vfs.readText(path.join(root, viteConfig)) ?? "",
      viteConfig,
      "envDir"
    );
    if (lookup.status === "literal") {
      envDir = path.posix
        .normalize(lookup.value)
        .replace(/^\.\/?$/, "")
        .replace(/\/+$/, "");
    } else if (lookup.status === "dynamic") {
      return {
        status: "unsupported",
        error: {
          code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
          message: `${viteConfig} sets envDir dynamically, so the CLI can't tell where to write PUCK_API_KEY.`,
          details: { docs: MANUAL_INTEGRATION_DOCS_URL },
        },
      };
    }
  }

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

interface Detector {
  id: FrameworkId;
  /** The package whose presence marks the framework */
  dep: string;
  /** Frameworks this one runs on top of or replaces, e.g. vinext over next */
  supersedes?: FrameworkId[];
  detect: (vfs: Vfs, root: string, range: string) => FrameworkDetection;
}

const DETECTORS: Detector[] = [
  { id: "next", dep: "next", detect: detectNext },
  { id: "react-router", dep: "@react-router/dev", detect: detectReactRouter },
  // Projects migrating to vinext usually keep next installed
  { id: "vinext", dep: "vinext", supersedes: ["next"], detect: detectVinext },
];

export const detectFramework = (
  vfs: Vfs,
  root: string,
  deps: Record<string, string>
): FrameworkDetection => {
  const present = DETECTORS.filter((d) => d.dep in deps);
  const superseded = present.flatMap((d) => d.supersedes ?? []);
  const matches = present.filter((d) => !superseded.includes(d.id));

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
    return match.detect(vfs, root, deps[match.dep]);
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
