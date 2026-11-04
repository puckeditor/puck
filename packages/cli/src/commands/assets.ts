import path from "node:path";
import type { RunContext } from "../context";
import type { CommandResult, RequiredAction } from "../result";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import { rerunCommand } from "../context";
import { detectProject } from "../detect/project";
import { capabilityStatus, detectState } from "../detect/state";
import { Planner } from "../plan/planner";
import { applyPlan } from "../apply/applier";
import { isValidApiKeyFormat } from "../secret";
import { assetsSummary, displayPath, projectSummary } from "../output/summary";
import type { PuckField } from "../ast/puck-fields";
import {
  assetCandidates,
  findConfigObject,
  listFields,
} from "../ast/puck-fields";
import { toAssetFields } from "../ast/asset-fields";
import type { AssetPaths } from "../assets/migrate-data";
import { assetPaths, migratePageData } from "../assets/migrate-data";
import type { CloudApi } from "../auth/cloud-api";
import { CloudRequestError } from "../auth/cloud-api";
import { API_KEYS_PATH, CANONICAL_INVOCATION, ENV_KEY } from "../constants";
import { assertSupported, serializeSteps } from "./mutate";
import { baseDir, resolveTarget } from "./target";

const USAGE = `Usage: \`${CANONICAL_INVOCATION} assets migrate [--field <Component.field>]...\`.`;

/** Page data the local recipes' save route keeps */
const LOCAL_PAGES = "database.json";

/** `puck assets migrate` */
export const runAssets = async (
  rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  const [sub, ...rest] = positionals;
  if (sub !== "migrate" || rest.length)
    throw new CliError("PUCK-CLI-INVALID-ARGS", USAGE);
  return runAssetsMigrate(rc);
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const describeField = (field: PuckField, config: string) =>
  `${
    field.shape === "object" ? "{ src } object" : field.type
  } field · ${config}:${field.line}`;

/** Which fields to switch: --field, the checkboxes, or null to ask an agent */
const chooseFields = async (
  rc: RunContext,
  fields: PuckField[],
  candidates: PuckField[],
  config: string
): Promise<PuckField[] | null> => {
  if (rc.flags.field.length) {
    const switchable = fields.filter((f) => f.shape);
    return [...new Set(rc.flags.field)].map((id) => {
      const field = switchable.find((f) => f.id === id);
      if (field) return field;
      const exists = fields.some((f) => f.id === id);
      throw new CliError(
        "PUCK-CLI-INVALID-ARGS",
        exists
          ? `${id} can't hold an asset. Choose a text, textarea or { src } object field.`
          : `${id} isn't a field in ${config}.`,
        { fields: switchable.map((f) => f.id) }
      );
    });
  }
  if (!rc.interactive) return null;
  const ids = await rc.prompter.checkbox(
    "Which fields should use the asset library?",
    candidates.map((field) => ({
      value: field.id,
      name: field.id,
      description: describeField(field, config),
      checked: field.match === "strong",
    }))
  );
  return candidates.filter((f) => ids.includes(f.id));
};

const fieldsAction = (
  rc: RunContext,
  candidates: PuckField[],
  config: string
): RequiredAction => ({
  id: "assets:fields",
  type: "choose_fields",
  required: true,
  flag: "--field",
  message: `Ask the developer which of these fields in ${config} should use the asset library. Each one's stored URLs become { src } values, in the config and in saved pages. Re-run with --field for each one chosen.`,
  choices: candidates.map((field) => ({
    value: field.id,
    label: field.id,
    description: describeField(field, config),
    recommended: field.match === "strong",
  })),
  rerun: `${rerunCommand(rc)} --field <Component.field>`,
});

/** Migrates database.json's pages, if it has any to change */
const planLocalPages = (p: Planner, paths: AssetPaths) => {
  const file = p.abs(LOCAL_PAGES);
  const text = p.vfs.readText(file);
  if (text === null) return false;
  let pages: unknown;
  try {
    pages = JSON.parse(text);
  } catch {
    p.warn(
      "PUCK-CLI-W-LOCAL-PAGES-INVALID",
      `${LOCAL_PAGES} isn't valid JSON, so its pages weren't migrated.`
    );
    return false;
  }
  if (!pages || typeof pages !== "object") return false;

  let changed = 0;
  for (const data of Object.values(pages))
    changed += migratePageData(data, paths);
  if (!changed) return false;

  // Keep the file's layout: indented as it was, or on one line
  const indent = /\n(\s+)"/.exec(text)?.[1];
  p.modifyFile(
    LOCAL_PAGES,
    `${JSON.stringify(pages, null, indent)}${text.endsWith("\n") ? "\n" : ""}`,
    {
      capability: "assets",
      summary: `Turn ${plural(changed, "URL")} into assets in ${LOCAL_PAGES}`,
    }
  );
  return true;
};

/**
 * Migrates each Cloud page as new versions, keeping what's live and what's
 * a draft: the published version is republished migrated, then a newer
 * draft is saved again on top
 */
const migrateCloudPages = async (
  cloud: CloudApi,
  key: string,
  paths: AssetPaths,
  log: (line: string) => void
) => {
  const outcome = {
    migrated: [] as string[],
    unchanged: 0,
    failed: [] as string[],
  };
  const pages = await cloud.listPages(key);

  for (const [i, page] of pages.entries()) {
    try {
      const { latestVersionId: latestId, publishedVersionId: publishedId } =
        page;
      if (!latestId) {
        outcome.unchanged++;
        continue;
      }
      const published = publishedId
        ? await cloud.getPageVersion(key, page.id, publishedId)
        : null;
      const draft =
        latestId !== publishedId
          ? await cloud.getPageVersion(key, page.id, latestId)
          : null;
      const publishedChanged =
        published !== null && migratePageData(published, paths) > 0;
      const draftChanged = draft !== null && migratePageData(draft, paths) > 0;

      if (publishedChanged)
        await cloud.savePage(key, page.id, {
          data: published,
          status: "published",
        });
      // Republishing puts the published version on top, so the draft goes back above it
      if (draft !== null && (draftChanged || publishedChanged))
        await cloud.savePage(key, page.id, {
          data: draft,
          status: "unpublished",
        });

      if (publishedChanged || draftChanged) {
        outcome.migrated.push(page.path);
        log(`Migrated ${page.path}`);
      } else {
        outcome.unchanged++;
      }
    } catch (err) {
      if (!(err instanceof CloudRequestError)) throw err;
      // The rest would fail the same way
      if (err.kind !== "bad_response") {
        outcome.failed.push(...pages.slice(i).map((p) => p.path));
        return { ...outcome, error: err };
      }
      outcome.failed.push(page.path);
    }
  }
  return { ...outcome, error: null };
};

const runAssetsMigrate = async (rc: RunContext): Promise<CommandResult> => {
  const { deps, flags } = rc;
  const base = baseDir(rc);
  const result = emptyResult("assets", flags.dryRun);

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
      "No supported app was found in this workspace."
    );
  }

  const vfs = new Vfs();
  const ctx = detectProject({
    vfs,
    root: target.root,
    cwd: base,
    packageManagerFlag: flags.packageManager,
    env: deps.env,
  });
  assertSupported(rc, ctx);
  const state = detectState(vfs, ctx, deps.env, { configFlag: flags.config });
  result.project = projectSummary(ctx, target.workspace);
  result.assets = assetsSummary(state);
  const where =
    target.root === deps.cwd
      ? ""
      : ` --cwd ${displayPath(deps.cwd, target.root)}`;

  const config = state.puck.configFile;
  if (!config) {
    throw new CliError(
      "PUCK-CLI-CONFIG-NOT-FOUND",
      state.target === "server"
        ? "Servers have no Puck config. Run this in the editor's app."
        : "No puck.config was found. Pass its path with --config.",
      { fix: `${CANONICAL_INVOCATION} assets migrate --config <file>` }
    );
  }

  const status = capabilityStatus(state);
  if (!status.assets.satisfied) {
    result.status = "action_required";
    result.message =
      "Puck Assets isn't set up yet. Add it, then migrate fields to it.";
    result.actions = [
      {
        id: "assets:add",
        type: "run_command",
        required: true,
        message: "Add Puck Assets to the editor and Cloud route first.",
        command: `${CANONICAL_INVOCATION} add assets${where}`,
        reason: "assets_missing",
        rerun: rerunCommand(rc),
      },
    ];
    return result;
  }

  const code = vfs.readText(path.join(ctx.root, config)) ?? "";
  const found = findConfigObject(code, config);
  if (!found.ok)
    throw new CliError(
      "PUCK-CLI-CONFIG-UNSUPPORTED",
      `Couldn't read the fields in ${config}: ${found.detail}.`
    );
  const fields = listFields(code, found);
  const candidates = assetCandidates(fields);

  if (!flags.field.length && !candidates.length) {
    result.message = `No image fields were found in ${config}. Choose fields with --field <Component.field>.`;
    return result;
  }
  const chosen = await chooseFields(rc, fields, candidates, config);
  if (!chosen) {
    result.status = "action_required";
    result.message = `Choose which fields in ${config} should use the asset library. No changes have been made.`;
    result.actions = [fieldsAction(rc, candidates, config)];
    return result;
  }
  if (!chosen.length) {
    result.message = "No fields were chosen. Nothing changed.";
    return result;
  }

  const ids = chosen.map((f) => f.id);
  const migrate = {
    config,
    fields: ids,
    files: [] as string[],
    pages: { migrated: [] as string[], unchanged: 0, failed: [] as string[] },
  };
  result.assetsMigrate = migrate;

  const planner = new Planner(vfs, ctx, state, deps.templates, deps.cliVersion);
  const rewrite = toAssetFields(code, config, ids);
  if (rewrite.status === "error")
    throw new CliError("PUCK-CLI-CONFIG-UNSUPPORTED", rewrite.detail);
  if (rewrite.status === "edited") {
    planner.modifyFile(config, rewrite.code, {
      capability: "assets",
      summary: `Switch ${ids.join(", ")} to the asset library in ${config}`,
    });
    for (const m of rewrite.manual) {
      planner.manual({
        id: `assets:${m.kind}:${m.field}`,
        type: "manual_edit",
        capability: "assets",
        required: true,
        file: config,
        reason: "unsupported_shape",
        message: `${m.detail}.`,
        instructions: m.instructions,
        snippet: m.snippet,
      });
    }
  }

  // Saved pages keep the URLs, until they're turned into assets too
  const paths = assetPaths(chosen);
  const migrateData = !flags.noData && Object.keys(paths).length > 0;
  if (migrateData && planLocalPages(planner, paths))
    migrate.files.push(LOCAL_PAGES);
  const cloudPages =
    migrateData && status.pages.satisfied && !state.cloud.external;

  let key: string | null = null;
  if (cloudPages) {
    key = (flags.apiKey ?? state.cloud.apiKey.value)?.trim() ?? null;
    if (!key) {
      result.status = "action_required";
      result.message =
        "A Puck API key is required to migrate pages in Puck Cloud. No changes have been made.";
      result.actions = [
        {
          id: "assets:api-key",
          type: "provide_api_key",
          required: true,
          message: `Pass a Puck API key with --api-key, or set ${ENV_KEY}.`,
          url: new URL(API_KEYS_PATH, rc.cloud.baseUrl).toString(),
          instructions:
            "Create a key in Puck Cloud, then re-run with --api-key <key>.",
          flag: "--api-key",
          env: ENV_KEY,
          rerun: `${rerunCommand(rc)} --api-key <key>`,
        },
      ];
      return result;
    }
    if (!isValidApiKeyFormat(key))
      throw new CliError(
        "PUCK-CLI-INVALID-API-KEY",
        "The API key isn't a valid Puck API key."
      );
    rc.secrets.add(key);
  }

  result.plan = { steps: serializeSteps(base, planner.steps) };
  result.warnings = planner.warnings;
  const cloudStep = "Turn URLs into assets in pages stored in Puck Cloud";

  if (!planner.steps.length && !cloudPages) {
    result.message = `${ids.join(", ")} already ${
      ids.length === 1 ? "uses" : "use"
    } the asset library. Nothing changed.`;
    return result;
  }

  if (flags.dryRun) {
    result.actions = planner.actions;
    result.message = `Dry run: no changes were made.${
      cloudPages ? ` Pages stored in Puck Cloud would be migrated too.` : ""
    }`;
    return result;
  }

  // Saved pages change too, so it needs the same consent as edits
  if (!rc.interactive && !flags.yes) {
    result.status = "action_required";
    result.message = `Review the plan, then re-run with --yes to apply it.${
      cloudPages ? " Pages stored in Puck Cloud are migrated too." : ""
    }`;
    result.actions = [
      {
        id: "confirm",
        type: "confirm_plan",
        required: true,
        flag: "--yes",
        message: "Re-run with --yes to apply these changes.",
        rerun: `${rerunCommand(rc)} --yes`,
      },
    ];
    return result;
  }
  if (rc.interactive) {
    rc.log("");
    rc.log("Planned changes:");
    for (const step of result.plan.steps) rc.log(`  + ${step.summary}`);
    if (cloudPages) rc.log(`  + ${cloudStep}`);
    rc.log("");
    if (!(await rc.prompter.confirm("Apply these changes?", true)))
      throw new CliError(
        "PUCK-CLI-CANCELLED",
        "Cancelled. No changes were made."
      );
  }

  const outcome = await applyPlan(rc, vfs, planner.steps);
  result.filesModified = outcome.modified.map((f) => displayPath(base, f));
  result.changed = outcome.modified.length > 0;
  result.actions = planner.actions;

  const done = [
    `Switched ${plural(ids.length, "field")} to the asset library`,
    ...(migrate.files.length
      ? [`turned their URLs into assets in ${migrate.files.join(", ")}`]
      : []),
  ];

  if (cloudPages && key) {
    let cloud: Awaited<ReturnType<typeof migrateCloudPages>>;
    try {
      cloud = await migrateCloudPages(rc.cloud, key, paths, rc.log);
    } catch (err) {
      if (!(err instanceof CloudRequestError)) throw err;
      result.status = "partial";
      result.message = `${done.join(
        ", "
      )}, but couldn't read pages from Puck Cloud: ${
        err.message
      }. Re-run the command to migrate them.`;
      result.nextSteps = [rerunCommand(rc)];
      return result;
    }
    migrate.pages = {
      migrated: cloud.migrated,
      unchanged: cloud.unchanged,
      failed: cloud.failed,
    };
    if (cloud.migrated.length) {
      result.changed = true;
      done.push(
        `migrated ${plural(cloud.migrated.length, "page")} in Puck Cloud`
      );
    }
    if (cloud.failed.length) {
      result.status = "partial";
      result.message = `${done.join(", ")}, but ${plural(
        cloud.failed.length,
        "page"
      )} couldn't be migrated${
        cloud.error ? `: ${cloud.error.message}` : ""
      }. Re-run the command to migrate the rest.`;
      result.nextSteps = [rerunCommand(rc)];
      return result;
    }
  }

  const manual = result.actions.some((a) => a.required);
  result.status = manual ? "partial" : "success";
  result.message = `${done.join(", ").replace(/, ([^,]*)$/, " and $1")}.${
    manual ? " Complete the required actions below." : ""
  }`;
  return result;
};
