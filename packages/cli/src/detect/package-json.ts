import path from "node:path";
import type { Vfs } from "../io/vfs";

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  [key: string]: unknown;
}

export type PackageJsonRead =
  | { status: "ok"; pkg: PackageJson }
  | { status: "missing" }
  | { status: "invalid"; error: string };

export const readPackageJson = (vfs: Vfs, dir: string): PackageJsonRead => {
  const text = vfs.readText(path.join(dir, "package.json"));
  if (text === null) return { status: "missing" };
  try {
    const pkg = JSON.parse(text);
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
      return { status: "invalid", error: "package.json is not an object" };
    }
    return { status: "ok", pkg };
  } catch (err) {
    return { status: "invalid", error: (err as Error).message };
  }
};

export const depsOf = (pkg: PackageJson | null): Record<string, string> => ({
  ...(pkg?.devDependencies ?? {}),
  ...(pkg?.dependencies ?? {}),
});

/** Finds the installed version of a package by walking up node_modules */
export const resolveInstalledVersion = (
  vfs: Vfs,
  fromDir: string,
  name: string
): string | null => {
  let dir = fromDir;
  for (;;) {
    const text = vfs.readText(
      path.join(dir, "node_modules", name, "package.json")
    );
    if (text) {
      try {
        const version = JSON.parse(text).version;
        return typeof version === "string" ? version : null;
      } catch {
        return null;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

/** The major and minor version from a version or range, e.g. "^16.2.1" → [16, 2] */
export const versionOf = (
  versionOrRange: string | null | undefined
): [major: number, minor: number] | null => {
  if (!versionOrRange) return null;
  const cleaned = versionOrRange.replace(/^(workspace:|npm:[^@]+@)/, "");
  const match = /(\d+)(?:\.(\d+))?/.exec(cleaned);
  return match ? [Number(match[1]), Number(match[2] ?? 0)] : null;
};

/** Whether a version or range starts at `min`'s major.minor or later */
export const atLeast = (
  versionOrRange: string | null | undefined,
  min: string
) => {
  const [major, minor] = versionOf(versionOrRange) ?? [0, 0];
  const [minMajor, minMinor] = versionOf(min) ?? [0, 0];
  return major > minMajor || (major === minMajor && minor >= minMinor);
};

/** The major version from a version or range, e.g. "^16.2.1" → 16 */
export const majorOf = (
  versionOrRange: string | null | undefined
): number | null => versionOf(versionOrRange)?.[0] ?? null;
