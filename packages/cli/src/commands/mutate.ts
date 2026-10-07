import path from "node:path";
import type { RunContext } from "../context";
import type {
  CapabilityId,
  CommandResult,
  RequiredAction,
  SerializedStep,
  WorkspaceSummary,
} from "../result";
import type { FrameworkId } from "../detect/framework";
import type { PlanStep } from "../plan/types";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import { detectProject, ProjectContext } from "../detect/project";
import { capabilityStatus, detectState } from "../detect/state";
import { FRAMEWORK_LABELS, SUPPORTED_FRAMEWORKS } from "../detect/framework";
import { ADAPTERS, adapterFor } from "../frameworks";
import type { LegacyScaffold } from "../frameworks/adapter";
import { Planner } from "../plan/planner";
import { planCapabilities, resolveCapabilities } from "../plan/capabilities";
import { planEnvWrite, planGitignore } from "../plan/env";
import { scaffoldApp } from "../plan/bootstrap";
import { planAllowedBuilds } from "../plan/pnpm-builds";
import { formatCommand, installCommand } from "../plan/install";
import { resolveBackend } from "../plan/backend";
import { resolveCredential, CredentialResolution } from "../auth/credentials";
import { applyPlan } from "../apply/applier";
import {
  aiSummary,
  capabilityLabels,
  cloudSummary,
  displayPath,
  projectSummary,
  puckSummary,
} from "../output/summary";
import { baseDir } from "./target";
import { rerunCommand } from "../context";
import { ENV_KEY, MANUAL_INTEGRATION_DOCS_URL } from "../constants";

export interface MutationInput {
  command: "init" | "add";
  requested: CapabilityId[];
  root: string;
  bootstrap?: {
    framework: FrameworkId;
    dir: string;
    appName: string;
    workspaceRoot?: string;
  };
  notes?: string[];
  workspace?: WorkspaceSummary | null;
}

export const serializeSteps = (
  base: string,
  steps: PlanStep[]
): SerializedStep[] =>
  steps.map((step) => {
    const out: SerializedStep = {
      id: step.id,
      kind: step.kind,
      capability: step.capability,
      summary: step.summary,
    };
    if ("path" in step) out.path = displayPath(base, step.path);
    if (step.kind === "install_package") {
      out.packages = step.packages.map((p) => `${p.name}@${p.range}`);
      out.command = formatCommand(step.run);
    }
    if (step.kind === "install_dependencies" || step.kind === "run_command")
      out.command = formatCommand(step.run);
    if (step.kind === "modify_file") out.edits = step.edits;
    if (step.kind === "scaffold_app") {
      out.path = displayPath(base, step.dir);
      out.files = step.files;
    }
    return out;
  });

export const assertSupported = (rc: RunContext, ctx: ProjectContext) => {
  if (!ctx.hasPackageJson) {
    throw new CliError(
      "PUCK-CLI-NO-PACKAGE-JSON",
      `No package.json found in ${ctx.root}.`,
      {
        fix: "npx @puckeditor/cli init",
      }
    );
  }
  if (ctx.packageJsonError) {
    throw new CliError(
      "PUCK-CLI-INVALID-PACKAGE-JSON",
      `package.json couldn't be parsed: ${ctx.packageJsonError}`
    );
  }
  if (ctx.frameworkError) {
    throw new CliError(
      ctx.frameworkError.code,
      ctx.frameworkError.message,
      ctx.frameworkError.details
    );
  }
  if (!ctx.framework) {
    throw new CliError(
      "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
      `No React framework found. The CLI supports ${SUPPORTED_FRAMEWORKS}.`,
      { docs: MANUAL_INTEGRATION_DOCS_URL }
    );
  }
  if (rc.flags.framework && rc.flags.framework !== ctx.framework.id) {
    throw new CliError(
      "PUCK-CLI-FRAMEWORK-MISMATCH",
      `--framework ${rc.flags.framework} was given, but this project uses ${
        FRAMEWORK_LABELS[ctx.framework.id]
      }.`
    );
  }
  if (!ctx.typescript) {
    throw new CliError(
      "PUCK-CLI-TYPESCRIPT-REQUIRED",
      "The CLI currently integrates Puck into TypeScript projects only (no tsconfig.json found).",
      { docs: MANUAL_INTEGRATION_DOCS_URL }
    );
  }
};

export const runMutation = async (
  rc: RunContext,
  input: MutationInput
): Promise<CommandResult> => {
  const { deps, flags } = rc;
  const base = baseDir(rc);
  const result = emptyResult(input.command, flags.dryRun);
  const vfs = new Vfs();
  const bootstrap = input.bootstrap;
  const root = bootstrap?.dir ?? input.root;
  const cloudHost = deps.env.PUCK_CLOUD_URL
    ? `${deps.env.PUCK_CLOUD_URL.replace(/\/+$/, "")}/api`
    : undefined;

  let scaffoldStep: PlanStep | null = null;
  let legacy: LegacyScaffold | null = null;
  if (bootstrap) {
    const adapter = ADAPTERS[bootstrap.framework];
    // With Puck Cloud, start from the AI recipe: the known-good editor + Cloud + AI setup
    const recipe = adapter.recipe(input.requested.includes("ai"));
    legacy = adapter.legacyScaffold?.(deps.nodeVersion) ?? null;
    const { files } = scaffoldApp(vfs, deps.templates, {
      recipe,
      dir: bootstrap.dir,
      appName: bootstrap.appName,
      cliVersion: deps.cliVersion,
      cloudHost,
      legacy,
    });
    scaffoldStep = {
      id: "bootstrap:scaffold",
      kind: "scaffold_app",
      capability: "bootstrap",
      summary: `Create a ${
        FRAMEWORK_LABELS[bootstrap.framework]
      } app with Puck in ${displayPath(base, bootstrap.dir)}`,
      framework: bootstrap.framework,
      dir: bootstrap.dir,
      files,
    };
  }

  const ctx = detectProject({
    vfs,
    root,
    cwd: base,
    packageManagerFlag: flags.packageManager,
    env: deps.env,
    knownWorkspaceRoot: bootstrap?.workspaceRoot,
  });
  assertSupported(rc, ctx);

  const state = detectState(vfs, ctx, deps.env, { configFlag: flags.config });
  const capabilities = resolveCapabilities(input.requested);
  const planner = new Planner(vfs, ctx, state, deps.templates, deps.cliVersion);
  planner.scaffolded = Boolean(bootstrap);
  planner.cloudHost = cloudHost;

  if (legacy) planner.warn("PUCK-CLI-W-NODE-VERSION", legacy.warning);
  for (const warning of ctx.warnings)
    planner.warn("PUCK-CLI-W-DETECTION", warning);

  const summaries = () => {
    result.project = projectSummary(ctx, input.workspace ?? null);
    result.puck = puckSummary(state);
    result.cloud = cloudSummary(state, "none");
    result.ai = aiSummary(state);
  };

  const finishWithoutChanges = (
    status: CommandResult["status"],
    message: string,
    actions: RequiredAction[]
  ) => {
    summaries();
    result.status = status;
    result.message = message;
    result.plan = { steps: serializeSteps(base, planner.steps) };
    result.actions = [...actions, ...planner.actions];
    result.warnings = planner.warnings;
    return result;
  };

  const adapter = adapterFor(ctx.framework!);
  if (adapter.backend) {
    const status = capabilityStatus(state);
    const resolution = await resolveBackend(
      rc,
      adapter.backend(ctx.framework!),
      capabilities,
      {
        editor: capabilities.includes("editor") && !status.editor.satisfied,
        cloud: !status.cloud.satisfied,
      }
    );
    if (resolution.kind === "action") {
      return finishWithoutChanges("action_required", resolution.message, [
        resolution.action,
      ]);
    }
    planner.backend = resolution.backend;
  }

  planCapabilities(planner, capabilities);
  planner.finalize();
  if (bootstrap) planAllowedBuilds(planner);

  if (scaffoldStep) planner.steps.unshift(scaffoldStep);

  // A server the app proxies to holds the Cloud route and its key
  const wantsCloud =
    capabilities.includes("cloud") &&
    planner.backend?.mode !== "external" &&
    !state.cloud.external;
  const needsConsent =
    planner.steps.length > 0 || (wantsCloud && !state.cloud.apiKey.present);

  // Never start a login or mutate without explicit consent
  if (!flags.dryRun && needsConsent && !rc.interactive && !flags.yes) {
    return finishWithoutChanges(
      "action_required",
      "Review the plan, then re-run with --yes to apply it.",
      [
        {
          id: "confirm",
          type: "confirm_plan",
          required: true,
          flag: "--yes",
          message: "Re-run with --yes to apply these changes.",
          rerun: `${rerunCommand(rc)} --yes`,
        },
      ]
    );
  }

  if (!flags.dryRun && rc.interactive && planner.steps.length > 0) {
    rc.log("");
    rc.log("Planned changes:");
    for (const step of serializeSteps(base, planner.steps))
      rc.log(`  + ${step.summary}`);
    if (wantsCloud && !state.cloud.apiKey.present)
      rc.log("  + Connect to Puck Cloud");
    rc.log("");
    if (!(await rc.prompter.confirm("Apply these changes?", true))) {
      throw new CliError(
        "PUCK-CLI-CANCELLED",
        "Cancelled. No changes were made."
      );
    }
  }

  let credential: CredentialResolution | null = null;
  if (wantsCloud) {
    credential = await resolveCredential(rc, state, {
      projectRoot: root,
      projectName:
        bootstrap?.appName ?? ctx.packageJson?.name ?? path.basename(root),
      framework: ctx.framework!.id,
    });
    for (const w of credential.warnings) planner.warn(w.code, w.message);

    if (credential.kind === "action") {
      return finishWithoutChanges(
        "action_required",
        credential.action.type === "browser_login"
          ? "Puck Cloud login required. No changes have been made yet."
          : "A Puck API key is required. No changes have been made yet.",
        [credential.action]
      );
    }

    if (credential.kind === "resolved" && credential.needsWrite) {
      planEnvWrite(planner, credential.secret);
    } else if (credential.kind === "resolved" && state.cloud.apiKey.file) {
      planGitignore(planner, state.cloud.apiKey.file);
    } else if (credential.kind === "none" && credential.reason === "dry-run") {
      planner.warn(
        "PUCK-CLI-W-KEY-NEEDED",
        `No ${ENV_KEY} found. You'll be asked to log in to Puck Cloud when you run this without --dry-run.`
      );
    }
  }

  if (bootstrap) {
    const spec = installCommand(ctx);
    planner.steps.push({
      id: "bootstrap:install",
      kind: "install_dependencies",
      capability: "bootstrap",
      summary: `Install dependencies (${formatCommand(spec)})`,
      run: spec,
    });
  }

  if (flags.dryRun) {
    return finishWithoutChanges(
      "success",
      planner.steps.length
        ? "Dry run: no changes were made."
        : "Already set up. Nothing to do.",
      []
    );
  }

  const outcome = await applyPlan(rc, vfs, planner.steps);

  // Verify against the real file system
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
  const status = capabilityStatus(verifiedState);

  let verified: "remote" | "local" | "failed" | "none" = "none";
  if (wantsCloud && credential?.kind === "resolved") {
    const check =
      credential.verified === "skipped"
        ? await rc.cloud.verifyKey(credential.secret.reveal())
        : credential.verified;
    verified =
      check === "valid" ? "remote" : check === "invalid" ? "failed" : "local";
  }

  const actions = [...planner.actions];
  if (
    wantsCloud &&
    credential?.kind === "none" &&
    credential.reason === "no-env-write" &&
    !verifiedState.cloud.apiKey.present
  ) {
    actions.push({
      id: "cloud:env",
      type: "set_environment_variable",
      required: true,
      name: "PUCK_API_KEY",
      message: `Set ${ENV_KEY} in your environment. --no-env-write was used, so it wasn't written to a file.`,
      instructions: `Create a key at ${new URL(
        "/api-keys",
        rc.cloud.baseUrl
      )} and set ${ENV_KEY} wherever the app runs.`,
    });
  }

  const unsatisfied = capabilities.filter((c) => !status[c].satisfied);
  const blocked = actions.some((a) => a.required) || unsatisfied.length > 0;

  result.project = projectSummary(verifiedCtx, input.workspace ?? null);
  result.puck = puckSummary(verifiedState);
  result.cloud = cloudSummary(verifiedState, verified);
  result.ai = aiSummary(verifiedState);
  result.plan = { steps: serializeSteps(base, planner.steps) };
  result.changed = planner.steps.length > 0;
  result.filesCreated = outcome.created.map((f) => displayPath(base, f)).sort();
  result.filesModified = [...outcome.created, ...outcome.modified]
    .map((f) => displayPath(base, f))
    .sort();
  result.packagesInstalled = outcome.packagesInstalled;
  result.actions = actions;
  result.warnings = planner.warnings;
  result.status = blocked ? "partial" : "success";

  // Only name what this run set up, not what was already there
  const before = capabilityStatus(state);
  const done = capabilities.filter(
    (c) => status[c].satisfied && (bootstrap || !before[c].satisfied)
  );
  result.message = blocked
    ? `Partially set up. ${
        unsatisfied.length
          ? `Still missing: ${unsatisfied
              .flatMap((c) => status[c].missing)
              .join("; ")}.`
          : "Complete the required actions below."
      }`
    : result.changed
    ? `Set up ${done
        .map((c) => capabilityLabels(state.target === "server")[c])
        .join(", ")
        .replace(/, ([^,]*)$/, " and $1")}.`
    : "Already set up. Nothing changed.";

  const devCommand = `${verifiedCtx.packageManager.name} ${
    verifiedCtx.packageManager.name === "npm" ? "run " : ""
  }dev`;
  const cdPrefix = root === base ? "" : `cd ${displayPath(base, root)} && `;
  result.nextSteps = [
    ...(input.notes ?? []).map((n) => `# ${n}`),
    `${cdPrefix}${devCommand}`,
    `# then open ${adapterFor(verifiedCtx.framework ?? ctx.framework!).devUrl}`,
  ];

  if (wantsCloud && !capabilities.includes("ai") && !status.ai.satisfied) {
    result.warnings.push({
      code: "PUCK-CLI-W-NO-CLIENT-PLUGIN",
      message:
        "Puck Cloud is set up, but nothing in the editor uses it yet. Add Puck AI with `npx @puckeditor/cli add ai`.",
    });
    result.nextSteps.unshift(
      `npx @puckeditor/cli add ai${
        root === base ? "" : ` --cwd ${displayPath(base, root)}`
      }`
    );
  }

  // Fresh apps get started with the editor open; existing projects and agents get nextSteps
  if (rc.interactive && bootstrap && verifiedCtx.packageJson?.scripts?.dev) {
    result.nextSteps = (input.notes ?? []).map((n) => `# ${n}`);
    rc.afterOutput = async () => {
      rc.log("");
      rc.log(`Starting the dev server (${devCommand})…`);
      await deps.runDevServer(
        {
          command: verifiedCtx.packageManager.name,
          args: ["run", "dev"],
          cwd: root,
        },
        (url) => {
          const editor = new URL("/edit", url).toString();
          rc.log(`Opening ${editor}`);
          void deps.openUrl(editor);
        }
      );
    };
  }

  return result;
};
