import path from "node:path";
import type { RunContext } from "../context";
import type { CapabilityId, CommandResult, RequiredAction } from "../result";
import type { FrameworkId } from "../detect/framework";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import {
  detectFramework,
  FRAMEWORK_IDS,
  FRAMEWORK_LABELS,
} from "../detect/framework";
import { ADAPTERS } from "../frameworks";
import { isEmptyDir } from "../detect/project";
import { appsDirFor } from "../detect/workspace";
import { APP_NAME, sanitizeAppName } from "../plan/bootstrap";
import { rerunCommand } from "../context";
import { displayPath } from "../output/summary";
import { baseDir, resolveTarget } from "./target";
import { runMutation } from "./mutate";
import { depsOf, readPackageJson } from "../detect/package-json";
import { CLOUD_CLIENT_PACKAGE, PLUGIN_AI_PACKAGE } from "../constants";

const FRAMEWORK_CHOICES: { value: FrameworkId; label: string }[] =
  FRAMEWORK_IDS.map((value) => ({
    value,
    label:
      ADAPTERS[value].kind === "server"
        ? `${FRAMEWORK_LABELS[value]} server (Puck APIs for an editor elsewhere)`
        : FRAMEWORK_LABELS[value],
  }));

const validateName = (name: string) => {
  if (!APP_NAME.test(name) || name.includes("..")) {
    throw new CliError(
      "PUCK-CLI-INVALID-APP-NAME",
      `"${name}" isn't a valid app name. Use lowercase letters, numbers, dots, dashes and underscores.`
    );
  }
};

/**
 * Puck AI is optional. It needs Puck Cloud (its backend), which
 * resolveCapabilities pulls in, so Cloud isn't offered on its own. Returns
 * null when the developer has to choose and can't be prompted.
 */
const chooseCapabilities = async (
  rc: RunContext,
  alreadySetUp: boolean,
  server: boolean
): Promise<CapabilityId[] | null> => {
  // Puck Pages and Puck Auth are opt-in, alongside the choice of Puck AI
  const extras: CapabilityId[] = [
    ...(rc.flags.pages ? (["pages"] as const) : []),
    ...(rc.flags.auth ? (["auth"] as const) : []),
  ];
  if (rc.flags.ai) return ["editor", "ai", ...extras];
  if (rc.flags.noAi) return ["editor", ...extras];
  if (alreadySetUp) return ["editor", "ai", ...extras];
  if (!rc.interactive) return null;
  const withAi = await rc.prompter.confirm(
    server
      ? "Serve Puck AI from this server? (sets up Puck Cloud, requires a Puck Cloud account)"
      : "Add Puck AI? (includes Puck Cloud, requires a Puck Cloud account)",
    false
  );
  return withAi ? ["editor", "ai", ...extras] : ["editor", ...extras];
};

const AI_CHOICE_FLAGS = "<--ai|--no-ai>";

const aiChoiceAction = (server = false): RequiredAction => ({
  id: "init:ai",
  type: "choose_ai",
  required: true,
  message: server
    ? "Choose whether this server should serve Puck AI for your editor. It sets up Puck Cloud and requires a Puck Cloud account."
    : "Choose whether to add Puck AI. It includes Puck Cloud and requires a Puck Cloud account.",
  choices: server
    ? [
        { value: "--ai", label: "Pages API, Puck Cloud and Puck AI" },
        { value: "--no-ai", label: "Pages API only" },
      ]
    : [
        { value: "--ai", label: "Add Puck AI and Puck Cloud" },
        { value: "--no-ai", label: "Editor only" },
      ],
});

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
      const detection = detectFramework(vfs, target.root, deps);
      const server =
        detection.status === "detected" &&
        ADAPTERS[detection.info.id].kind === "server";
      const requested = await chooseCapabilities(
        rc,
        CLOUD_CLIENT_PACKAGE in deps && (server || PLUGIN_AI_PACKAGE in deps),
        server
      );
      if (!requested) {
        const action = aiChoiceAction(server);
        action.rerun = `${rerunCommand(rc)} ${AI_CHOICE_FLAGS}`;
        const result = emptyResult("init", rc.flags.dryRun);
        result.status = "action_required";
        result.message =
          "Choose whether to add Puck AI; no changes have been made.";
        result.actions = [action];
        return result;
      }
      return runMutation(rc, {
        command: "init",
        requested,
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

  if (!rc.interactive && !rc.flags.ai && !rc.flags.noAi) {
    missing.push(aiChoiceAction());
  }

  if (missing.length > 0) {
    const flags = missing.map((a) =>
      a.type === "choose_framework"
        ? `--framework <${FRAMEWORK_IDS.join("|")}>`
        : a.type === "choose_ai"
        ? AI_CHOICE_FLAGS
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
    // Non-null: a missing choice was returned as an action above
    requested: (await chooseCapabilities(
      rc,
      false,
      ADAPTERS[framework!].kind === "server"
    ))!,
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
