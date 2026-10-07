import type { Vfs } from "../io/vfs";
import type { FrameworkInfo } from "../detect/framework";
import type { SourceScan } from "../detect/scan";
import type { Planner } from "../plan/planner";
import type { RecipeName } from "../templates/source";
import type { BackendOptions } from "../plan/backend";

export interface CloudRouteDetection {
  /** Project-relative path the CLI creates the Puck Cloud route at */
  expectedRouteFile: string;
  routeFile: string | null;
  /** Whether the route is registered, for frameworks with a routes file */
  routeRegistered: boolean | "n/a";
  /** Served by another server the app proxies to, so nothing is needed here */
  external?: boolean;
}

export interface PagesApiDetection {
  /** Project-relative module serving the pages API */
  file: string;
  mounted: boolean;
}

/** Older framework versions to scaffold when the recipe's need a newer Node */
export interface LegacyScaffold {
  /** Package name → range, replacing the recipe's */
  dependencies: Record<string, string>;
  /** package.json `engines.node` */
  node: string;
  /** Recipe-relative path → rewrite of its contents */
  files: Record<string, (text: string) => string>;
  warning: string;
}

/** Everything the CLI does differently per framework */
export interface FrameworkAdapter<I extends FrameworkInfo = FrameworkInfo> {
  /**
   * "server" frameworks serve Puck's APIs for an editor that lives elsewhere:
   * the editor capability is the pages API, and Puck AI only configures the
   * Cloud route
   */
  kind?: "server";
  recipe: (withAi: boolean) => RecipeName;
  /** For new apps, when this Node can't run the recipe's framework version */
  legacyScaffold?: (nodeVersion: string) => LegacyScaffold | null;
  /** Recipe-relative path of the Puck Cloud route, pointed at PUCK_CLOUD_URL when scaffolding */
  recipeCloudRoute: string;
  /** Project-relative directory the app's source lives in, for the JSON output */
  appDir: (info: I) => string;
  /** Project-relative directories searched for puck.config, in order */
  configDirs: (info: I) => string[];
  /** Project-relative directory env files are loaded from */
  envDir: (info: I) => string;
  detectCloudRoute: (
    info: I,
    vfs: Vfs,
    root: string,
    scan: SourceScan
  ) => CloudRouteDetection;
  /** For client-only apps, which need a server chosen by the developer */
  backend?: (info: I) => BackendOptions;
  /** For servers, the pages API that stands in for the editor */
  detectPagesApi?: (
    info: I,
    vfs: Vfs,
    root: string
  ) => PagesApiDetection | null;
  planEditor: (p: Planner, info: I, withAi: boolean) => void;
  planCloudRoute: (p: Planner, info: I, withAi: boolean) => void;
  /** Adds Puck AI to an editor that was set up before */
  planAi: (p: Planner, info: I) => void;
  /** Moves the editor and rendering to pages stored in Puck Cloud */
  planPages: (p: Planner, info: I) => void;
  /** Requires Sign in with Puck for the editor and the Cloud route */
  planAuth: (p: Planner, info: I) => void;
  devUrl: string;
  deployEnvWarning: string;
}

/** Prefers the expected route file, then any handler inside the app directory ("" for the project root) */
export const findCloudRoute = (
  scan: SourceScan,
  appDir: string,
  expected: string
) => {
  const inAppDir = scan.cloudHandlerFiles.filter(
    (f) => !appDir || f.startsWith(`${appDir}/`)
  );
  return inAppDir.includes(expected) ? expected : inAppDir[0] ?? null;
};
