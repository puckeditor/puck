import fs from "node:fs";
import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { PlanStep, CommandSpec } from "../plan/types";
import type { RunContext } from "../context";
import { hashContent } from "../io/vfs";
import { CliError } from "../errors";
import { formatCommand } from "../plan/install";

export interface ApplyOutcome {
  /** Absolute paths */
  created: string[];
  modified: string[];
  packagesInstalled: string[];
}

const tail = (text: string, lines = 20) =>
  text.trim().split("\n").slice(-lines).join("\n");

const run = async (rc: RunContext, spec: CommandSpec) => {
  rc.log(`$ ${formatCommand(spec)}`);
  const result = await rc.deps.runner.run(spec.command, spec.args, {
    cwd: spec.cwd,
  });

  if (result.code === 127 || /ENOENT/.test(result.stderr)) {
    throw new CliError(
      "PUCK-CLI-PACKAGE-MANAGER-NOT-FOUND",
      `Couldn't run ${spec.command}. Is it installed?`,
      {
        command: formatCommand(spec),
      }
    );
  }
  if (result.code !== 0) {
    throw new CliError(
      "PUCK-CLI-INSTALL-FAILED",
      `\`${formatCommand(spec)}\` failed with exit code ${result.code}.`,
      {
        command: formatCommand(spec),
        cwd: spec.cwd,
        output: rc.secrets.scrub(tail(`${result.stdout}\n${result.stderr}`)),
      }
    );
  }
};

const writeFile = (file: string, content: Buffer, mode?: number) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (mode === undefined) {
    fs.writeFileSync(file, content);
    return;
  }
  // Write secrets atomically with restrictive permissions
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.tmp`
  );
  fs.writeFileSync(temp, content, { mode });
  fs.chmodSync(temp, mode);
  fs.renameSync(temp, file);
};

/**
 * Executes a plan: verifies nothing changed since planning, installs
 * packages, flushes the overlay to disk, runs framework setup commands, then
 * runs any full install.
 */
export const applyPlan = async (
  rc: RunContext,
  vfs: Vfs,
  steps: PlanStep[]
): Promise<ApplyOutcome> => {
  const pending = vfs.pending();

  for (const write of pending) {
    let current: Buffer | null = null;
    try {
      current = fs.readFileSync(write.path);
    } catch {
      current = null;
    }
    const currentHash = current ? hashContent(current) : null;
    if (currentHash !== write.beforeHash) {
      throw new CliError(
        "PUCK-CLI-FILE-CHANGED",
        `${write.path} changed while the CLI was running. Re-run the command.`
      );
    }
  }

  const packagesInstalled: string[] = [];
  for (const step of steps) {
    if (step.kind !== "install_package") continue;
    await run(rc, step.run);
    packagesInstalled.push(...step.packages.map((p) => `${p.name}@${p.range}`));
  }

  const created: string[] = [];
  const modified: string[] = [];
  for (const write of pending) {
    try {
      writeFile(write.path, write.content, write.mode);
    } catch (err) {
      throw new CliError(
        "PUCK-CLI-WRITE-FAILED",
        `Couldn't write ${write.path}: ${(err as Error).message}`
      );
    }
    (write.existed ? modified : created).push(write.path);
  }

  // Framework setup commands (e.g. `astro add`) edit the files as written
  for (const step of steps) {
    if (step.kind !== "run_command") continue;
    await run(rc, step.run);
  }

  for (const step of steps) {
    if (step.kind !== "install_dependencies") continue;
    await run(rc, step.run);
  }

  return { created, modified, packagesInstalled };
};
