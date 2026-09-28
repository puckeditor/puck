import path from "node:path";
import type { ProjectContext } from "../detect/project";
import type { CommandSpec } from "./types";
import { toPosix } from "../detect/scan";

/** `add` command for the target app, scoped to it when inside a workspace */
export const addCommand = (
  ctx: ProjectContext,
  packages: string[],
  { dev = false }: { dev?: boolean } = {}
): CommandSpec => {
  const pm = ctx.packageManager.name;
  const specs = dev ? [pm === "bun" ? "-d" : "-D", ...packages] : packages;
  const ws = ctx.workspace && !ctx.workspace.isRoot ? ctx.workspace : null;
  const name = ctx.packageJson?.name;

  if (ws) {
    const relDir = toPosix(path.relative(ws.root, ctx.root));
    if (pm === "pnpm" && name)
      return {
        command: "pnpm",
        args: ["--filter", name, "add", ...specs],
        cwd: ws.root,
      };
    if (pm === "npm")
      return {
        command: "npm",
        args: ["install", ...specs, "-w", relDir],
        cwd: ws.root,
      };
    if (pm === "yarn" && name)
      return {
        command: "yarn",
        args: ["workspace", name, "add", ...specs],
        cwd: ws.root,
      };
  }

  if (pm === "npm")
    return { command: "npm", args: ["install", ...specs], cwd: ctx.root };
  return { command: pm, args: ["add", ...specs], cwd: ctx.root };
};

/** Full install, run from the workspace root when there is one */
export const installCommand = (ctx: ProjectContext): CommandSpec => {
  const pm = ctx.packageManager.name;
  const cwd = ctx.workspace?.root ?? ctx.root;

  // CI environments default to frozen lockfiles, which a brand new app can't satisfy
  if (pm === "pnpm")
    return { command: "pnpm", args: ["install", "--no-frozen-lockfile"], cwd };
  if (pm === "yarn") {
    return {
      command: "yarn",
      args: ctx.packageManager.yarnBerry
        ? ["install", "--no-immutable"]
        : ["install"],
      cwd,
    };
  }
  return { command: pm, args: ["install"], cwd };
};

export const formatCommand = (spec: CommandSpec) =>
  [spec.command, ...spec.args]
    .map((a) => (/[\s"'$]/.test(a) ? JSON.stringify(a) : a))
    .join(" ");

/** Runs a package's binary from the target app, e.g. `astro add react` */
export const execCommand = (
  ctx: ProjectContext,
  bin: string,
  args: string[]
): CommandSpec => {
  const pm = ctx.packageManager.name;
  if (pm === "pnpm")
    return { command: "pnpm", args: ["exec", bin, ...args], cwd: ctx.root };
  if (pm === "yarn")
    return { command: "yarn", args: [bin, ...args], cwd: ctx.root };
  if (pm === "bun")
    return { command: "bunx", args: [bin, ...args], cwd: ctx.root };
  return { command: "npx", args: [bin, ...args], cwd: ctx.root };
};
