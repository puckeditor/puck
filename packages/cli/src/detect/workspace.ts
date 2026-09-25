import path from "node:path";
import { globSync } from "tinyglobby";
import { parse as parseYaml } from "yaml";
import type { Vfs } from "../io/vfs";
import { readPackageJson } from "./package-json";

export interface WorkspacePackage {
  name: string | null;
  /** Absolute directory */
  dir: string;
}

export interface WorkspaceInfo {
  root: string;
  source: "pnpm-workspace.yaml" | "package.json";
  globs: string[];
  packages: WorkspacePackage[];
}

const readGlobs = (
  vfs: Vfs,
  dir: string
): Omit<WorkspaceInfo, "root" | "packages"> | null => {
  const yamlText = vfs.readText(path.join(dir, "pnpm-workspace.yaml"));
  if (yamlText !== null) {
    try {
      const parsed = parseYaml(yamlText) as { packages?: unknown } | null;
      const globs = Array.isArray(parsed?.packages)
        ? parsed!.packages.filter((g): g is string => typeof g === "string")
        : [];
      return { source: "pnpm-workspace.yaml", globs };
    } catch {
      return { source: "pnpm-workspace.yaml", globs: [] };
    }
  }

  const read = readPackageJson(vfs, dir);
  if (read.status !== "ok" || !read.pkg.workspaces) return null;

  const { workspaces } = read.pkg;
  const globs = Array.isArray(workspaces)
    ? workspaces
    : workspaces.packages ?? [];
  return {
    source: "package.json",
    globs: globs.filter((g) => typeof g === "string"),
  };
};

export const expandWorkspace = (
  vfs: Vfs,
  root: string,
  globs: string[]
): WorkspacePackage[] => {
  const positive = globs.filter((g) => !g.startsWith("!"));
  const negative = globs
    .filter((g) => g.startsWith("!"))
    .map((g) => g.slice(1));
  if (positive.length === 0) return [];

  const clean = (g: string) => g.replace(/^\.\//, "").replace(/\/+$/, "");
  const files = globSync(
    positive.map((g) => `${clean(g)}/package.json`),
    {
      cwd: root,
      ignore: [
        "**/node_modules/**",
        ...negative.map((g) => `${clean(g)}/package.json`),
      ],
      absolute: false,
    }
  );

  return files
    .map((file) => path.join(root, path.dirname(file)))
    .filter((dir) => dir !== root)
    .sort()
    .map((dir) => {
      const read = readPackageJson(vfs, dir);
      return { dir, name: read.status === "ok" ? read.pkg.name ?? null : null };
    });
};

/** Walks up from `startDir` to the nearest workspace root */
export const findWorkspace = (
  vfs: Vfs,
  startDir: string,
  stopAt: string | null
): WorkspaceInfo | null => {
  for (let dir = startDir; ; ) {
    const globs = readGlobs(vfs, dir);
    if (globs) {
      return {
        root: dir,
        ...globs,
        packages: expandWorkspace(vfs, dir, globs.globs),
      };
    }
    const parent = path.dirname(dir);
    if (dir === stopAt || parent === dir) return null;
    dir = parent;
  }
};

/** First `<dir>/*` glob, preferring apps/*, used to place new apps */
export const appsDirFor = (globs: string[]): string | null => {
  const simple = globs
    .filter((g) => !g.startsWith("!"))
    .map((g) => g.replace(/^\.\//, ""))
    .map((g) => /^([A-Za-z0-9._-]+)\/\*$/.exec(g)?.[1])
    .filter((d): d is string => Boolean(d));
  return simple.find((d) => d === "apps") ?? simple[0] ?? null;
};
