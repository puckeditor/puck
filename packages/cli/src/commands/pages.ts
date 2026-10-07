import path from "node:path";
import type { RunContext } from "../context";
import type { CommandResult } from "../result";
import { Vfs } from "../io/vfs";
import { CliError } from "../errors";
import { emptyResult } from "../result";
import { rerunCommand } from "../context";
import { findApiKey } from "../env/files";
import { isValidApiKeyFormat } from "../secret";
import { displayPath } from "../output/summary";
import { CloudRequestError, IMPORT_BATCH_SIZE } from "../auth/cloud-api";
import { API_KEYS_PATH, CANONICAL_INVOCATION, ENV_KEY } from "../constants";
import { baseDir } from "./target";

const USAGE = `Usage: \`${CANONICAL_INVOCATION} pages import <file.json>\`.`;

/** `puck pages import <file.json>` */
export const runPages = async (
  rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  const [sub, ...rest] = positionals;
  if (sub !== "import" || rest.length !== 1)
    throw new CliError("PUCK-CLI-INVALID-ARGS", USAGE);
  return runPagesImport(rc, rest[0]);
};

const invalid = (message: string, details?: Record<string, unknown>) =>
  new CliError("PUCK-CLI-PAGES-FILE-INVALID", message, details);

/** A JSON object of Puck data keyed by route, e.g. a recipe's database.json */
const readPages = (vfs: Vfs, file: string, shown: string) => {
  const text = vfs.readText(file);
  if (text === null) throw invalid(`${shown} doesn't exist.`);

  let pages: unknown;
  try {
    pages = JSON.parse(text);
  } catch (err) {
    throw invalid(`${shown} isn't valid JSON: ${(err as Error).message}`);
  }
  if (!pages || typeof pages !== "object" || Array.isArray(pages))
    throw invalid(
      `${shown} must be an object of Puck data keyed by route, e.g. { "/about": { "content": [], "root": {} } }.`
    );

  for (const [route, data] of Object.entries(pages)) {
    if (!route.startsWith("/"))
      throw invalid(`"${route}" in ${shown} isn't a route starting with /.`, {
        route,
      });
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw invalid(`The page for "${route}" in ${shown} isn't Puck data.`, {
        route,
      });
  }
  return pages as Record<string, unknown>;
};

const runPagesImport = async (
  rc: RunContext,
  arg: string
): Promise<CommandResult> => {
  const { deps, flags } = rc;
  const base = baseDir(rc);
  const vfs = new Vfs();
  const file = path.resolve(base, arg);
  const shown = displayPath(base, file);
  const pages = readPages(vfs, file, shown);
  const routes = Object.keys(pages);

  const result = emptyResult("pages", flags.dryRun);
  const pagesImport = {
    file: shown,
    total: routes.length,
    created: [] as string[],
    skipped: [] as string[],
    notImported: [] as string[],
  };
  result.pagesImport = pagesImport;

  // The key for a project, as for the app's Cloud route
  const key = flags.apiKey ?? findApiKey(vfs, base, deps.env).value;
  if (!key) {
    result.status = "action_required";
    result.message = `A Puck API key is required to import pages. No pages have been imported.`;
    result.actions = [
      {
        id: "pages:api-key",
        type: "provide_api_key",
        required: true,
        message: `Pass a Puck API key with --api-key, set ${ENV_KEY}, or run this from the app with ${ENV_KEY} in its env file.`,
        url: new URL(API_KEYS_PATH, rc.cloud.baseUrl).toString(),
        instructions: `Create a key in Puck Cloud, then re-run with --api-key <key>.`,
        flag: "--api-key",
        env: ENV_KEY,
        rerun: `${rerunCommand(rc)} --api-key <key>`,
      },
    ];
    result.nextSteps = [`${CANONICAL_INVOCATION} connect`];
    return result;
  }
  if (!isValidApiKeyFormat(key.trim())) {
    throw new CliError(
      "PUCK-CLI-INVALID-API-KEY",
      "The API key isn't a valid Puck API key."
    );
  }
  rc.secrets.add(key.trim());

  const summary = `Import and publish ${routes.length} page${
    routes.length === 1 ? "" : "s"
  } from ${shown} to Puck Cloud`;
  if (flags.dryRun) {
    result.message = `Dry run: would ${summary[0].toLowerCase()}${summary.slice(
      1
    )}.`;
    return result;
  }

  // Publishing is visible to everyone, so it needs the same consent as edits
  if (!rc.interactive && !flags.yes) {
    result.status = "action_required";
    result.message = `Re-run with --yes to ${summary[0].toLowerCase()}${summary.slice(
      1
    )}.`;
    result.actions = [
      {
        id: "confirm",
        type: "confirm_plan",
        required: true,
        flag: "--yes",
        message: "Re-run with --yes to import the pages.",
        rerun: `${rerunCommand(rc)} --yes`,
      },
    ];
    return result;
  }
  if (
    rc.interactive &&
    !(await rc.prompter.confirm(`${summary}? Existing pages are kept.`, true))
  ) {
    throw new CliError(
      "PUCK-CLI-CANCELLED",
      "Cancelled. No pages were imported."
    );
  }

  for (let i = 0; i < routes.length; i += IMPORT_BATCH_SIZE) {
    const batch = routes.slice(i, i + IMPORT_BATCH_SIZE);
    try {
      const imported = await rc.cloud.importPages(
        key.trim(),
        Object.fromEntries(batch.map((route) => [route, pages[route]]))
      );
      pagesImport.created.push(...imported.created);
      pagesImport.skipped.push(...imported.skipped);
      rc.log(
        `Imported ${Math.min(i + IMPORT_BATCH_SIZE, routes.length)} of ${
          routes.length
        } pages`
      );
    } catch (err) {
      if (!(err instanceof CloudRequestError)) throw err;
      const fix =
        err.kind === "rejected" ? `${CANONICAL_INVOCATION} connect` : undefined;
      if (i === 0) {
        throw new CliError(
          err.kind === "unreachable"
            ? "PUCK-CLI-CLOUD-UNREACHABLE"
            : err.kind === "rejected"
            ? "PUCK-CLI-API-KEY-REJECTED"
            : "PUCK-CLI-PAGES-IMPORT-FAILED",
          `${err.message}. No pages were imported.`,
          fix ? { fix } : undefined
        );
      }
      // Routes that were imported are skipped when this runs again
      pagesImport.notImported = routes.slice(i);
      result.status = "partial";
      result.changed = pagesImport.created.length > 0;
      result.message = `Imported ${i} of ${routes.length} pages before Puck Cloud failed: ${err.message}. Re-run the command to import the rest.`;
      result.nextSteps = [rerunCommand(rc)];
      return result;
    }
  }

  result.changed = pagesImport.created.length > 0;
  result.message = `Published ${pagesImport.created.length} page${
    pagesImport.created.length === 1 ? "" : "s"
  } to Puck Cloud${
    pagesImport.skipped.length
      ? `, and skipped ${pagesImport.skipped.length} that already exist${
          pagesImport.skipped.length === 1 ? "s" : ""
        }`
      : ""
  }.`;
  return result;
};
