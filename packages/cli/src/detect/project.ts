import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { CliErrorPayload } from "../errors";
import { depsOf, PackageJson, readPackageJson } from "./package-json";
import {
  detectPackageManager,
  PackageManagerInfo,
  PackageManagerName,
} from "./package-manager";
import { detectFramework, FrameworkInfo } from "./framework";
import { findWorkspace, WorkspaceInfo } from "./workspace";

const IGNORABLE_ENTRIES = new Set([
  ".git",
  ".DS_Store",
  "Thumbs.db",
  ".idea",
  ".vscode",
]);

export interface ProjectContext {
  /** Directory the CLI was invoked from, used for display paths */
  cwd: string;
  /** Absolute app root */
  root: string;
  hasPackageJson: boolean;
  packageJson: PackageJson | null;
  packageJsonError: string | null;
  deps: Record<string, string>;
  packageManager: PackageManagerInfo;
  framework: FrameworkInfo | null;
  frameworkError: CliErrorPayload | null;
  typescript: boolean;
  gitRoot: string | null;
  isEmptyDir: boolean;
  /** The enclosing workspace, when `root` is a member package or the workspace root */
  workspace: (WorkspaceInfo & { isRoot: boolean }) | null;
  warnings: string[];
}

export const findGitRoot = (vfs: Vfs, start: string): string | null => {
  for (let dir = start; ; ) {
    if (vfs.exists(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

export const isEmptyDir = (vfs: Vfs, dir: string) =>
  vfs.list(dir).every((e) => IGNORABLE_ENTRIES.has(e.name));

export const detectProject = ({
  vfs,
  root,
  cwd,
  packageManagerFlag,
  env,
  knownWorkspaceRoot,
}: {
  vfs: Vfs;
  root: string;
  cwd: string;
  packageManagerFlag?: PackageManagerName;
  env: Record<string, string | undefined>;
  /** Treat `root` as a member of this workspace even if it only exists in the overlay */
  knownWorkspaceRoot?: string;
}): ProjectContext => {
  const warnings: string[] = [];
  const gitRoot = findGitRoot(vfs, root);

  const read = readPackageJson(vfs, root);
  const packageJson = read.status === "ok" ? read.pkg : null;
  const deps = depsOf(packageJson);

  let workspace: ProjectContext["workspace"] = null;
  const found = findWorkspace(vfs, root, gitRoot);
  if (found) {
    const isRoot = found.root === root;
    const isMember =
      found.packages.some((p) => p.dir === root) ||
      found.root === knownWorkspaceRoot;
    if (isRoot || isMember) {
      workspace = { ...found, isRoot };
    } else {
      warnings.push(
        `${root} is inside the workspace at ${found.root} but isn't matched by its package globs; treating it as a standalone project`
      );
    }
  }

  const packageManager = detectPackageManager({
    vfs,
    projectRoot: root,
    workspaceRoot: workspace?.root ?? null,
    stopAt: gitRoot,
    flag: packageManagerFlag,
    userAgent: env.npm_config_user_agent,
  });
  warnings.push(...packageManager.warnings);

  let framework: FrameworkInfo | null = null;
  let frameworkError: CliErrorPayload | null = null;
  if (packageJson) {
    const detection = detectFramework(vfs, root, deps);
    if (detection.status === "detected") framework = detection.info;
    if (detection.status === "unsupported") frameworkError = detection.error;
  }

  return {
    cwd,
    root,
    hasPackageJson: read.status !== "missing",
    packageJson,
    packageJsonError: read.status === "invalid" ? read.error : null,
    deps,
    packageManager,
    framework,
    frameworkError,
    typescript: vfs.exists(path.join(root, "tsconfig.json")),
    gitRoot,
    isEmptyDir: vfs.isDir(root) ? isEmptyDir(vfs, root) : true,
    workspace,
    warnings,
  };
};
