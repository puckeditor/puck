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

type Extra = "ai" | "pages" | "auth";

const EXTRAS: Record<
  "app" | "server",
  { value: Extra; name: string; description: string }[]
> = {
  app: [
    {
      value: "ai",
      name: "Puck AI",
      description: "Generate and edit pages with AI",
    },
    {
      value: "pages",
      name: "Puck Pages",
      description: "Store, publish and version pages in Puck Cloud",
    },
    {
      value: "auth",
      name: "Puck Auth",
      description: "Require Sign in with Puck to edit",
    },
  ],
  server: [
    {
      value: "ai",
      name: "Puck AI",
      description: "Serve Puck AI for your editor",
    },
    {
      value: "pages",
      name: "Puck Pages",
      description: "Serve pages published in Puck Cloud",
    },
    {
      value: "auth",
      name: "Puck Auth",
      description: "Require Sign in with Puck for Puck Cloud requests",
    },
  ],
};

const EXTRA_IDS: Extra[] = ["ai", "pages", "auth"];

/**
 * Which of Puck AI, Pages and Auth the flags choose, or null when they don't
 * say. All three are included by default, like the checkboxes:
 * --editor-only leaves out all of them, --ai, --pages and --auth pick exactly
 * those, and --no-ai, --no-pages and --no-auth drop one from the default.
 */
const chosenByFlags = ({ flags }: RunContext): Extra[] | null => {
  const on = { ai: flags.ai, pages: flags.pages, auth: flags.auth };
  const off = { ai: flags.noAi, pages: flags.noPages, auth: flags.noAuth };
  if (flags.editorOnly) return [];
  if (EXTRA_IDS.some((id) => on[id])) return EXTRA_IDS.filter((id) => on[id]);
  if (EXTRA_IDS.some((id) => off[id]))
    return EXTRA_IDS.filter((id) => !off[id]);
  return null;
};

/**
 * Puck AI, Pages and Auth are optional. Each needs Puck Cloud, which
 * resolveCapabilities pulls in, so Cloud isn't offered on its own. Returns
 * null when the developer has to choose and can't be prompted.
 */
const chooseCapabilities = async (
  rc: RunContext,
  alreadySetUp: boolean,
  server: boolean
): Promise<CapabilityId[] | null> => {
  const chosen = chosenByFlags(rc);
  if (chosen) return ["editor", ...chosen];
  if (alreadySetUp) return ["editor", "ai"];
  if (!rc.interactive) return null;
  const checked = await rc.prompter.checkbox(
    "What else should Puck include? (each needs a Puck Cloud account)",
    EXTRAS[server ? "server" : "app"].map((extra) => ({
      ...extra,
      checked: true,
    }))
  );
  return ["editor", ...checked];
};

const CAPABILITY_FLAGS = "[--ai] [--pages] [--auth]";

const capabilitiesAction = (server = false): RequiredAction => ({
  id: "init:capabilities",
  type: "choose_capabilities",
  required: true,
  message: `Ask the developer which of these to include, all recommended. Each sets up Puck Cloud, which requires a Puck Cloud account. Re-run with the flag for each one chosen, or --editor-only for none.`,
  choices: EXTRAS[server ? "server" : "app"].map((extra) => ({
    value: `--${extra.value}` as const,
    label: extra.name,
    description: extra.description,
    recommended: true,
  })),
  none: "--editor-only",
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
        const action = capabilitiesAction(server);
        action.rerun = `${rerunCommand(rc)} ${CAPABILITY_FLAGS}`;
        const result = emptyResult("init", rc.flags.dryRun);
        result.status = "action_required";
        result.message =
          "Choose what to include with Puck; no changes have been made.";
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

  if (!rc.interactive && !chosenByFlags(rc)) {
    missing.push(
      capabilitiesAction(
        Boolean(framework) && ADAPTERS[framework!].kind === "server"
      )
    );
  }

  if (missing.length > 0) {
    const flags = missing.map((a) =>
      a.type === "choose_framework"
        ? `--framework <${FRAMEWORK_IDS.join("|")}>`
        : a.type === "choose_capabilities"
        ? CAPABILITY_FLAGS
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
