import fs from "node:fs";
import path from "node:path";
import type { RunContext } from "../context";
import type { RequiredAction, WorkspaceSummary } from "../result";
import type { FrameworkId } from "../detect/framework";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { detectFramework, FRAMEWORK_LABELS } from "../detect/framework";
import { depsOf, readPackageJson } from "../detect/package-json";
import { findWorkspace, WorkspaceInfo } from "../detect/workspace";
import { findGitRoot } from "../detect/project";
import { detectPackageManager } from "../detect/package-manager";
import { CLOUD_CLIENT_PACKAGE, CORE_PACKAGE } from "../constants";
import { displayPath } from "../output/summary";
import { rerunCommand } from "../context";

export interface WorkspaceApp {
  name: string | null;
  dir: string;
  framework: FrameworkId | null;
  puck: boolean;
  cloud: boolean;
}

export type Target =
  | {
      kind: "root";
      root: string;
      note?: string;
      workspace: WorkspaceSummary | null;
    }
  | {
      kind: "workspace-empty";
      workspace: WorkspaceInfo;
      summary: WorkspaceSummary;
    }
  | { kind: "action"; action: RequiredAction; summary: WorkspaceSummary };

/** The directory the user pointed the CLI at */
export const baseDir = (rc: RunContext) => {
  const dir = path.resolve(rc.deps.cwd, rc.flags.cwd ?? ".");
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new CliError("PUCK-CLI-CWD-NOT-FOUND", `Directory not found: ${dir}`);
  }
  return dir;
};

export const listWorkspaceApps = (
  vfs: Vfs,
  workspace: WorkspaceInfo
): WorkspaceApp[] =>
  workspace.packages.map((pkg) => {
    const read = readPackageJson(vfs, pkg.dir);
    const deps = depsOf(read.status === "ok" ? read.pkg : null);
    const detection = detectFramework(vfs, pkg.dir, deps);
    return {
      name: pkg.name,
      dir: pkg.dir,
      framework: detection.status === "detected" ? detection.info.id : null,
      puck: CORE_PACKAGE in deps,
      cloud: CLOUD_CLIENT_PACKAGE in deps,
    };
  });

const workspaceSummary = (
  rc: RunContext,
  vfs: Vfs,
  workspace: WorkspaceInfo,
  apps: WorkspaceApp[],
  target: WorkspaceApp | null
): WorkspaceSummary => {
  const base = baseDir(rc);
  const pm = detectPackageManager({
    vfs,
    projectRoot: workspace.root,
    workspaceRoot: workspace.root,
    stopAt: workspace.root,
    flag: rc.flags.packageManager,
  });
  return {
    root: workspace.root,
    manager: pm.name,
    target: target
      ? { name: target.name, dir: displayPath(base, target.dir) }
      : null,
    packages: apps.map((a) => ({
      name: a.name,
      dir: displayPath(base, a.dir),
      framework: a.framework,
      puck: a.puck,
      cloud: a.cloud,
    })),
  };
};

const label = (base: string, app: WorkspaceApp) => {
  const fw = app.framework ? FRAMEWORK_LABELS[app.framework] : "unsupported";
  const state = app.cloud ? ", Puck Cloud" : app.puck ? ", Puck" : "";
  return `${app.name ?? displayPath(base, app.dir)} (${fw}${state})`;
};

/**
 * Works out which app to operate on. From a workspace root this picks the
 * only supported app, or asks which one to use.
 */
export const resolveTarget = async (
  rc: RunContext,
  opts: { prompt?: boolean } = {}
): Promise<Target> => {
  const base = baseDir(rc);
  const vfs = new Vfs();
  const workspace = findWorkspace(vfs, base, findGitRoot(vfs, base));

  if (rc.flags.workspace) {
    if (!workspace) {
      throw new CliError(
        "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND",
        `--workspace was given but ${base} isn't inside a workspace.`
      );
    }
    const wanted = rc.flags.workspace.replace(/\/+$/, "");
    const apps = listWorkspaceApps(vfs, workspace);
    const match = apps.find(
      (a) =>
        a.name === wanted ||
        a.dir === path.resolve(base, wanted) ||
        a.dir === path.resolve(workspace.root, wanted)
    );
    if (!match) {
      throw new CliError(
        "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND",
        `No workspace package matches "${rc.flags.workspace}".`,
        {
          candidates: apps.map((a) => ({
            name: a.name,
            dir: displayPath(base, a.dir),
          })),
        }
      );
    }
    return {
      kind: "root",
      root: match.dir,
      workspace: workspaceSummary(rc, vfs, workspace, apps, match),
    };
  }

  if (!workspace || workspace.root !== base) {
    return { kind: "root", root: base, workspace: null };
  }

  // At a workspace root: only redirect if the root itself isn't an app
  const rootRead = readPackageJson(vfs, base);
  const rootDetection = detectFramework(
    vfs,
    base,
    depsOf(rootRead.status === "ok" ? rootRead.pkg : null)
  );
  if (rootDetection.status === "detected")
    return { kind: "root", root: base, workspace: null };

  const apps = listWorkspaceApps(vfs, workspace);
  const supported = apps
    .filter((a) => a.framework)
    .sort(
      (a, b) => Number(b.puck) - Number(a.puck) || a.dir.localeCompare(b.dir)
    );

  if (supported.length === 0) {
    return {
      kind: "workspace-empty",
      workspace,
      summary: workspaceSummary(rc, vfs, workspace, apps, null),
    };
  }

  if (supported.length === 1) {
    const [only] = supported;
    return {
      kind: "root",
      root: only.dir,
      note: `Using ${label(
        base,
        only
      )}, the only supported app in this workspace`,
      workspace: workspaceSummary(rc, vfs, workspace, apps, only),
    };
  }

  const choices = supported.map((a) => ({
    value: displayPath(base, a.dir),
    label: label(base, a),
  }));

  if (rc.interactive && opts.prompt !== false) {
    const picked = await rc.prompter.select(
      "Which app should Puck be set up in?",
      choices.map((c) => ({ value: c.value, name: c.label }))
    );
    const app = supported.find((a) => displayPath(base, a.dir) === picked)!;
    return {
      kind: "root",
      root: app.dir,
      workspace: workspaceSummary(rc, vfs, workspace, apps, app),
    };
  }

  return {
    kind: "action",
    summary: workspaceSummary(rc, vfs, workspace, apps, null),
    action: {
      id: "workspace:target",
      type: "choose_workspace_package",
      required: true,
      message: "This workspace has several apps. Choose which one to set up.",
      flag: "--workspace",
      choices,
      rerun: `${rerunCommand(rc)} --workspace <dir>`,
    },
  };
};
