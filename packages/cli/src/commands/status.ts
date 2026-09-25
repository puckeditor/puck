import type { RunContext } from "../context";
import type { CommandResult } from "../result";
import { Vfs } from "../io/vfs";
import { emptyResult } from "../result";
import { detectProject } from "../detect/project";
import { capabilityStatus, detectState } from "../detect/state";
import {
  aiSummary,
  cloudSummary,
  displayPath,
  projectSummary,
  puckSummary,
} from "../output/summary";
import { baseDir, resolveTarget } from "./target";
import { CANONICAL_INVOCATION } from "../constants";

export const runStatus = async (rc: RunContext): Promise<CommandResult> => {
  const base = baseDir(rc);
  const result = emptyResult("status");
  const target = await resolveTarget(rc, { prompt: false });

  if (target.kind !== "root") {
    const vfs = new Vfs();
    const ctx = detectProject({
      vfs,
      root: base,
      cwd: base,
      packageManagerFlag: rc.flags.packageManager,
      env: rc.deps.env,
    });
    result.project = projectSummary(ctx, target.summary);
    const apps = target.summary.packages.filter((p) => p.framework);
    result.message = apps.length
      ? `Workspace with ${apps.length} supported apps. Choose one with --workspace.`
      : "Workspace with no supported apps.";
    result.nextSteps = apps.length
      ? apps.map(
          (a) =>
            `${CANONICAL_INVOCATION} ${
              a.cloud ? "status" : "init"
            } --workspace ${a.dir}`
        )
      : [`${CANONICAL_INVOCATION} init --name <name>`];
    return result;
  }

  const vfs = new Vfs();
  const ctx = detectProject({
    vfs,
    root: target.root,
    cwd: base,
    packageManagerFlag: rc.flags.packageManager,
    env: rc.deps.env,
  });

  if (!ctx.hasPackageJson) {
    result.message = "No project found. Run init to create a Puck app.";
    result.nextSteps = [`${CANONICAL_INVOCATION} init`];
    return result;
  }

  result.project = projectSummary(ctx, target.workspace);
  if (ctx.frameworkError || !ctx.framework) {
    result.message =
      ctx.frameworkError?.message ?? "No supported framework found.";
    result.warnings = ctx.frameworkError
      ? [{ code: ctx.frameworkError.code, message: ctx.frameworkError.message }]
      : [];
    result.nextSteps = [`${CANONICAL_INVOCATION} doctor`];
    return result;
  }

  const state = detectState(vfs, ctx, rc.deps.env, {
    configFlag: rc.flags.config,
  });
  const status = capabilityStatus(state);
  result.puck = puckSummary(state);
  result.cloud = cloudSummary(state);
  result.ai = aiSummary(state);
  result.warnings = ctx.warnings.map((message) => ({
    code: "PUCK-CLI-W-DETECTION",
    message,
  }));

  const where =
    target.root === rc.deps.cwd
      ? ""
      : ` --cwd ${displayPath(rc.deps.cwd, target.root)}`;
  if (!status.editor.satisfied) {
    result.message = "Puck isn't set up yet.";
    result.nextSteps = [`${CANONICAL_INVOCATION} init${where}`];
  } else if (!status.cloud.satisfied) {
    result.message = "Puck Editor is set up. Puck Cloud isn't connected.";
    result.nextSteps = [`${CANONICAL_INVOCATION} add ai${where}`];
  } else if (!status.ai.satisfied) {
    result.message =
      "Puck Editor and Puck Cloud are set up. Puck AI isn't added to the editor.";
    result.nextSteps = [`${CANONICAL_INVOCATION} add ai${where}`];
  } else {
    result.message = "Puck Editor, Puck Cloud and Puck AI are set up.";
    result.nextSteps = [`${CANONICAL_INVOCATION} doctor${where}`];
  }

  if (target.note) result.nextSteps.unshift(`# ${target.note}`);
  return result;
};
