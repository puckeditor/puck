import path from "node:path";
import type { ProjectContext } from "../detect/project";
import type { ProjectState } from "../detect/state";
import { adapterFor } from "../frameworks";
import type {
  AiSummary,
  AuthSummary,
  PagesSummary,
  CapabilityId,
  CloudSummary,
  ProjectSummary,
  PuckSummary,
  WorkspaceSummary,
} from "../result";
import { capabilityStatus } from "../detect/state";
import { toPosix } from "../detect/scan";

export const displayPath = (base: string, abs: string) => {
  const rel = toPosix(path.relative(base, abs));
  return rel === "" ? "." : rel;
};

/** Servers expose a pages API in place of the editor */
export const capabilityLabels = (
  server: boolean
): Record<CapabilityId, string> => ({
  editor: server ? "Puck pages API" : "Puck Editor",
  cloud: "Puck Cloud",
  ai: "Puck AI",
  pages: "Puck Pages",
  auth: "Puck Auth",
});

export const projectSummary = (
  ctx: ProjectContext,
  workspace: WorkspaceSummary | null = null
): ProjectSummary => ({
  root: ctx.root,
  framework: ctx.framework?.id ?? null,
  frameworkVersion: ctx.framework?.version ?? null,
  appDir: ctx.framework
    ? adapterFor(ctx.framework).appDir(ctx.framework)
    : null,
  packageManager: ctx.packageManager.name,
  typescript: ctx.typescript,
  workspace,
});

export const puckSummary = (state: ProjectState): PuckSummary => ({
  installed: state.puck.installed,
  version: state.puck.resolvedVersion ?? state.puck.declaredRange,
  configured: capabilityStatus(state).editor.satisfied,
  configFile: state.puck.configFile,
  editorFiles: state.scan.editorFiles,
});

export const cloudSummary = (
  state: ProjectState,
  verified: CloudSummary["verified"] = capabilityStatus(state).cloud.satisfied
    ? "local"
    : "none"
): CloudSummary => ({
  installed: state.cloud.clientInstalled,
  routeFile: state.cloud.routeFile,
  configured: capabilityStatus(state).cloud.satisfied,
  apiKey: {
    present: state.cloud.apiKey.present,
    source: state.cloud.apiKey.source,
  },
  verified,
});

export const aiSummary = (state: ProjectState): AiSummary => ({
  installed: state.ai.installed,
  configured: capabilityStatus(state).ai.satisfied,
});

/** A server serves published pages; an app has the editor plugin */
export const pagesSummary = (state: ProjectState): PagesSummary => ({
  installed:
    state.target === "server"
      ? state.scan.cloudPageFiles.length > 0
      : state.pages.pluginInstalled,
  configured: capabilityStatus(state).pages.satisfied,
});

/** A server requires Sign in with Puck; an app has the editor plugin */
export const authSummary = (state: ProjectState): AuthSummary => ({
  installed:
    state.target === "server"
      ? state.auth.routeAuthenticated
      : state.auth.pluginInstalled,
  configured: capabilityStatus(state).auth.satisfied,
});
