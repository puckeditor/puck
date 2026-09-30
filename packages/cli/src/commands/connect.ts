import path from "node:path";
import type { RunContext } from "../context";
import type { CommandResult } from "../result";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import { detectProject } from "../detect/project";
import { detectState } from "../detect/state";
import { Planner } from "../plan/planner";
import { planEnvWrite } from "../plan/env";
import { resolveCredential } from "../auth/credentials";
import { applyPlan } from "../apply/applier";
import { cloudSummary, displayPath, projectSummary } from "../output/summary";
import { CANONICAL_INVOCATION, ENV_KEY } from "../constants";
import { rerunCommand } from "../context";
import { assertSupported, serializeSteps } from "./mutate";
import { baseDir, resolveTarget } from "./target";

/**
 * Logs in to Puck Cloud again and replaces PUCK_API_KEY, even if a key is
 * already set. Only writes the key: code changes are `add cloud`'s job.
 */
export const runConnect = async (rc: RunContext): Promise<CommandResult> => {
  const { deps, flags } = rc;
  const result = emptyResult("connect", flags.dryRun);
  const target = await resolveTarget(rc);

  if (target.kind === "action") {
    result.status = "action_required";
    result.message = target.action.message;
    result.actions = [target.action];
    return result;
  }

  if (target.kind === "workspace-empty") {
    throw new CliError(
      "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
      `No supported app was found in this workspace. Run \`${CANONICAL_INVOCATION} init\` to create one.`,
      { fix: `${CANONICAL_INVOCATION} init --name <name>` }
    );
  }

  const base = baseDir(rc);
  const root = target.root;
  const vfs = new Vfs();
  const ctx = detectProject({
    vfs,
    root,
    cwd: base,
    packageManagerFlag: flags.packageManager,
    env: deps.env,
  });
  assertSupported(rc, ctx);

  const state = detectState(vfs, ctx, deps.env, { configFlag: flags.config });
  if (state.cloud.external) {
    throw new CliError(
      "PUCK-CLI-EXTERNAL-BACKEND",
      "This app sends Puck Cloud requests to a server elsewhere, and the key lives there. Run connect against that server instead.",
      { fix: `${CANONICAL_INVOCATION} connect --cwd <server dir>` }
    );
  }

  const planner = new Planner(vfs, ctx, state, deps.templates, deps.cliVersion);
  for (const warning of ctx.warnings)
    planner.warn("PUCK-CLI-W-DETECTION", warning);

  const cloudReady =
    state.cloud.clientInstalled &&
    Boolean(state.cloud.routeFile) &&
    state.cloud.routeRegistered !== false;
  const where = root === base ? "" : ` --cwd ${displayPath(base, root)}`;
  if (!cloudReady) {
    planner.warn(
      "PUCK-CLI-W-CLOUD-NOT-SET-UP",
      `Puck Cloud isn't set up in this app yet, so nothing uses ${ENV_KEY}. Run \`${CANONICAL_INVOCATION} add cloud\` to set it up.`
    );
  }

  const finish = (status: CommandResult["status"], message: string) => {
    result.status = status;
    result.message = message;
    result.project = projectSummary(ctx, target.workspace);
    result.cloud = cloudSummary(state, "none");
    result.warnings = planner.warnings;
    return result;
  };

  // Starting a login or replacing the key needs the same consent as `add`
  if (!flags.dryRun && !rc.interactive && !flags.yes) {
    result.actions = [
      {
        id: "confirm",
        type: "confirm_plan",
        required: true,
        flag: "--yes",
        message: `Re-run with --yes to log in to Puck Cloud and replace ${ENV_KEY}.`,
        rerun: `${rerunCommand(rc)} --yes`,
      },
    ];
    return finish(
      "action_required",
      `Re-run with --yes to log in to Puck Cloud and replace ${ENV_KEY}.`
    );
  }

  const credential = await resolveCredential(
    rc,
    state,
    {
      projectRoot: root,
      projectName: ctx.packageJson?.name ?? path.basename(root),
      framework: ctx.framework!.id,
    },
    { fresh: true }
  );
  for (const w of credential.warnings) planner.warn(w.code, w.message);

  if (credential.kind === "action") {
    result.actions = [credential.action];
    return finish(
      "action_required",
      credential.action.type === "browser_login"
        ? "Puck Cloud login required. No changes have been made yet."
        : "A Puck API key is required. No changes have been made yet."
    );
  }

  if (credential.kind === "none") {
    planner.warn(
      "PUCK-CLI-W-KEY-NEEDED",
      "You'll be asked to log in to Puck Cloud when you run this without --dry-run."
    );
    return finish("success", "Dry run: no changes were made.");
  }

  planEnvWrite(planner, credential.secret);
  result.plan = { steps: serializeSteps(base, planner.steps) };

  if (flags.dryRun) return finish("success", "Dry run: no changes were made.");

  const outcome = await applyPlan(rc, vfs, planner.steps);

  const after = new Vfs();
  const verifiedCtx = detectProject({
    vfs: after,
    root,
    cwd: base,
    packageManagerFlag: flags.packageManager,
    env: deps.env,
  });
  const verifiedState = detectState(after, verifiedCtx, deps.env, {
    configFlag: flags.config,
  });
  const check = credential.verified;

  finish(
    "success",
    `Connected to Puck Cloud. ${
      planner.steps.length
        ? `Saved ${ENV_KEY} to ${displayPath(
            base,
            verifiedState.cloud.apiKey.file ?? root
          )}.`
        : `${ENV_KEY} was already set to this key.`
    }`
  );
  result.project = projectSummary(verifiedCtx, target.workspace);
  result.cloud = cloudSummary(
    verifiedState,
    check === "valid" ? "remote" : check === "invalid" ? "failed" : "local"
  );
  result.changed = planner.steps.length > 0;
  result.filesCreated = outcome.created.map((f) => displayPath(base, f)).sort();
  result.filesModified = [...outcome.created, ...outcome.modified]
    .map((f) => displayPath(base, f))
    .sort();

  const pm = verifiedCtx.packageManager.name;
  const cdPrefix = root === base ? "" : `cd ${displayPath(base, root)} && `;
  result.nextSteps = cloudReady
    ? [
        "# Restart the dev server so it picks up the new key",
        `${cdPrefix}${pm} ${pm === "npm" ? "run " : ""}dev`,
      ]
    : [`${CANONICAL_INVOCATION} add cloud${where}`];

  return result;
};
