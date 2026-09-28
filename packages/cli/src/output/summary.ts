import path from "node:path";
import type { ProjectContext } from "../detect/project";
import type { ProjectState } from "../detect/state";
import { adapterFor } from "../frameworks";
import type {
  AiSummary,
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
