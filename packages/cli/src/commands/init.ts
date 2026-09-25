import path from "node:path";
import type { RunContext } from "../context";
import type { CapabilityId, CommandResult, RequiredAction } from "../result";
import type { FrameworkId } from "../detect/framework";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import { FRAMEWORK_LABELS } from "../detect/framework";
import { isEmptyDir } from "../detect/project";
import { appsDirFor } from "../detect/workspace";
import { APP_NAME, sanitizeAppName } from "../plan/bootstrap";
import { rerunCommand } from "../context";
import { displayPath } from "../output/summary";
import { baseDir, resolveTarget } from "./target";
import { runMutation } from "./mutate";
import { depsOf, readPackageJson } from "../detect/package-json";
import { CLOUD_CLIENT_PACKAGE, PLUGIN_AI_PACKAGE } from "../constants";

const FRAMEWORK_CHOICES: { value: FrameworkId; label: string }[] = [
  { value: "next", label: FRAMEWORK_LABELS.next },
  { value: "react-router", label: FRAMEWORK_LABELS["react-router"] },
];

const validateName = (name: string) => {
  if (!APP_NAME.test(name) || name.includes("..")) {
    throw new CliError(
      "PUCK-CLI-INVALID-APP-NAME",
      `"${name}" isn't a valid app name. Use lowercase letters, numbers, dots, dashes and underscores.`
    );
  }
};

/**
 * Puck Cloud is the backend and Puck AI the editor plugin that uses it, so
 * they're offered together. Agents get both unless they pass --no-cloud.
 */
const chooseCapabilities = async (
  rc: RunContext,
  alreadySetUp: boolean
): Promise<CapabilityId[]> => {
  if (rc.flags.noCloud) return ["editor"];
  if (rc.interactive && !alreadySetUp) {
    const withCloud = await rc.prompter.confirm(
      "Set up Puck Cloud and Puck AI? (requires a Puck Cloud account)",
      true
    );
    if (!withCloud) return ["editor"];
  }
  return ["editor", "cloud", "ai"];
};

export const runInit = async (rc: RunContext): Promise<CommandResult> => {
  const base = baseDir(rc);
  const target = await resolveTarget(rc);

  if (target.kind === "action") {
    const result = emptyResult("init", rc.flags.dryRun);
    result.status = "action_required";
    result.message = target.action.message;
    result.actions = [target.action];
    result.project = null;
    return result;
  }

  const vfs = new Vfs();
  let parentDir: string;
  let inPlace = false;
  let workspaceRoot: string | undefined;
  const existingNames = new Set<string>();

  if (target.kind === "workspace-empty") {
    const appsDir = appsDirFor(target.workspace.globs);
    if (!appsDir) {
      throw new CliError(
        "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND",
        "This workspace has no supported app, and none of its package globs look like `<dir>/*`, so the CLI doesn't know where to create one.",
        { globs: target.workspace.globs }
      );
    }
    parentDir = path.join(target.workspace.root, appsDir);
    workspaceRoot = target.workspace.root;
    for (const pkg of target.workspace.packages) {
      if (pkg.name) existingNames.add(pkg.name);
      existingNames.add(path.basename(pkg.dir));
    }
  } else {
    if (vfs.exists(path.join(target.root, "package.json"))) {
      const read = readPackageJson(vfs, target.root);
      const deps = depsOf(read.status === "ok" ? read.pkg : null);
      return runMutation(rc, {
        command: "init",
        requested: await chooseCapabilities(
          rc,
          CLOUD_CLIENT_PACKAGE in deps && PLUGIN_AI_PACKAGE in deps
        ),
        root: target.root,
        notes: target.note ? [target.note] : [],
        workspace: target.workspace,
      });
    }
    parentDir = target.root;
    inPlace = isEmptyDir(vfs, target.root) && !rc.flags.name;
  }

  // Bootstrap: gather every missing input before doing anything
  const missing: RequiredAction[] = [];
  let framework = rc.flags.framework;
  let name = rc.flags.name;

  if (!framework) {
    if (rc.interactive) {
      rc.log("No app found. Let's create one.");
      framework = await rc.prompter.select(
        "Which framework?",
        FRAMEWORK_CHOICES.map((c) => ({ value: c.value, name: c.label }))
      );
    } else {
      missing.push({
        id: "bootstrap:framework",
        type: "choose_framework",
        required: true,
        message: "No app was found here. Choose a framework for the new app.",
        flag: "--framework",
        choices: FRAMEWORK_CHOICES,
      });
    }
  }

  if (!name && !inPlace) {
    if (rc.interactive) {
      name = await rc.prompter.input("App name", {
        default: "my-puck-app",
        validate: (v) =>
          APP_NAME.test(v) && !v.includes("..")
            ? true
            : "Use lowercase letters, numbers, dots, dashes and underscores",
      });
    } else {
      missing.push({
        id: "bootstrap:name",
        type: "provide_app_name",
        required: true,
        message:
          "This directory isn't empty. Choose a name for the new app's directory.",
        flag: "--name",
        suggested: "my-puck-app",
      });
    }
  }

  if (missing.length > 0) {
    const flags = missing.map((a) =>
      a.type === "choose_framework"
        ? "--framework <next|react-router>"
        : "--name <name>"
    );
    for (const action of missing)
      action.rerun = `${rerunCommand(rc)} ${flags.join(" ")}`;
    const result = emptyResult("init", rc.flags.dryRun);
    result.status = "action_required";
    result.message =
      "No app found. Choose how to create one; no changes have been made.";
    result.actions = missing;
    return result;
  }

  if (name) validateName(name);
  if (name && existingNames.has(name)) {
    throw new CliError(
      "PUCK-CLI-INVALID-APP-NAME",
      `A workspace package named "${name}" already exists.`
    );
  }

  const dir = inPlace ? parentDir : path.join(parentDir, name!);
  if (!inPlace && vfs.exists(dir) && !isEmptyDir(vfs, dir)) {
    throw new CliError(
      "PUCK-CLI-TARGET-DIR-NOT-EMPTY",
      `${displayPath(base, dir)} already exists and isn't empty.`
    );
  }

  return runMutation(rc, {
    command: "init",
    requested: await chooseCapabilities(rc, false),
    root: dir,
    bootstrap: {
      framework: framework!,
      dir,
      appName: name ?? sanitizeAppName(path.basename(dir)),
      workspaceRoot,
    },
    workspace: target.kind === "workspace-empty" ? target.summary : null,
  });
};
