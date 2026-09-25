import path from "node:path";
import type { Vfs } from "../io/vfs";
import { readPackageJson } from "./package-json";

export type PackageManagerName = "pnpm" | "npm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: PackageManagerName[] = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
];

export interface PackageManagerInfo {
  name: PackageManagerName;
  source:
    | "flag"
    | "packageManager-field"
    | "lockfile"
    | "user-agent"
    | "default";
  /** Directory containing the lockfile, if one was found */
  lockfileDir: string | null;
  yarnBerry: boolean;
  warnings: string[];
}

const LOCKFILES: [string, PackageManagerName][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const fromField = (
  field: unknown
): { name: PackageManagerName; major: number | null } | null => {
  if (typeof field !== "string") return null;
  const match = /^(pnpm|npm|yarn|bun)@(\d+)?/.exec(field);
  return match
    ? {
        name: match[1] as PackageManagerName,
        major: match[2] ? Number(match[2]) : null,
      }
    : null;
};

export const detectPackageManager = ({
  vfs,
  projectRoot,
  workspaceRoot,
  stopAt,
  flag,
  userAgent,
}: {
  vfs: Vfs;
  projectRoot: string;
  workspaceRoot: string | null;
  /** Don't look for lockfiles above this directory (e.g. the git root) */
  stopAt: string | null;
  flag?: PackageManagerName;
  userAgent?: string;
}): PackageManagerInfo => {
  const warnings: string[] = [];

  let lockfileDir: string | null = null;
  let lockfileManager: PackageManagerName | null = null;

  for (let dir = projectRoot; ; ) {
    const found = LOCKFILES.filter(([file]) =>
      vfs.exists(path.join(dir, file))
    );
    if (found.length > 0) {
      lockfileDir = dir;
      lockfileManager = found[0][1];
      const managers = new Set(found.map(([, pm]) => pm));
      if (managers.size > 1) {
        warnings.push(
          `Multiple lockfiles found in ${dir} (${found
            .map(([f]) => f)
            .join(", ")}); using ${lockfileManager}`
        );
      }
      break;
    }
    const parent = path.dirname(dir);
    if (dir === stopAt || dir === workspaceRoot || parent === dir) break;
    dir = parent;
  }

  const fieldSources = [projectRoot, workspaceRoot].filter(Boolean) as string[];
  let field: ReturnType<typeof fromField> = null;
  for (const dir of fieldSources) {
    const read = readPackageJson(vfs, dir);
    field = read.status === "ok" ? fromField(read.pkg.packageManager) : null;
    if (field) break;
  }

  const berryRoot = workspaceRoot ?? lockfileDir ?? projectRoot;
  const yarnBerry =
    (field?.name === "yarn" && (field.major ?? 1) >= 2) ||
    vfs.exists(path.join(berryRoot, ".yarnrc.yml"));

  const agent = /^(pnpm|yarn|bun|npm)\//.exec(userAgent ?? "")?.[1] as
    | PackageManagerName
    | undefined;

  const result = (
    name: PackageManagerName,
    source: PackageManagerInfo["source"]
  ): PackageManagerInfo => ({
    name,
    source,
    lockfileDir,
    yarnBerry: name === "yarn" && yarnBerry,
    warnings,
  });

  if (flag) return result(flag, "flag");
  if (field) return result(field.name, "packageManager-field");
  if (lockfileManager) return result(lockfileManager, "lockfile");
  if (agent) return result(agent, "user-agent");
  return result("npm", "default");
};
