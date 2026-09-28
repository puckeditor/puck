import type { RunContext } from "../context";
import type { BackendChoice } from "../args";
import type { CapabilityId, RequiredAction } from "../result";
import type { ResolvedBackend } from "./planner";
import { CliError } from "../errors";
import { rerunCommand } from "../context";

export interface BackendOptions {
  /** A server Puck can already use, e.g. an Astro adapter */
  local: boolean;
  /** What "add" sets up, e.g. "Add a Hono server to this app" */
  addLabel: string;
}

const choicesFor = (
  options: BackendOptions,
  wantsCloud: boolean
): { value: BackendChoice; label: string }[] => [
  { value: "add", label: options.addLabel },
  {
    value: "external",
    label: "Use a server that runs elsewhere (with --backend-url)",
  },
  ...(wantsCloud
    ? []
    : [
        {
          value: "none" as const,
          label: "No server: the editor saves pages in the browser",
        },
      ]),
];

export type BackendResolution =
  | { kind: "resolved"; backend?: ResolvedBackend }
  | { kind: "action"; message: string; action: RequiredAction };

/**
 * Client-only apps need a server for pages and Puck Cloud. The developer
 * chooses where it comes from; it's never assumed.
 */
export const resolveBackend = async (
  rc: RunContext,
  options: BackendOptions,
  capabilities: CapabilityId[],
  planned: { editor: boolean; cloud: boolean }
): Promise<BackendResolution> => {
  if (options.local) return { kind: "resolved", backend: { mode: "local" } };

  const wantsCloud = capabilities.includes("cloud");
  // Nothing that needs a server will be planned
  if (!planned.editor && !(wantsCloud && planned.cloud))
    return { kind: "resolved" };

  const choices = choicesFor(options, wantsCloud);
  let mode = rc.flags.backend;

  if (!mode) {
    const message = wantsCloud
      ? "Puck Cloud needs a server to run on. Choose where it comes from."
      : "Choose where the editor saves pages.";
    if (!rc.interactive) {
      return {
        kind: "action",
        message: `${message} No changes have been made.`,
        action: {
          id: "backend",
          type: "choose_backend",
          required: true,
          flag: "--backend",
          message,
          choices,
          rerun: `${rerunCommand(rc)} --backend <${choices
            .map((c) => c.value)
            .join("|")}>`,
        },
      };
    }
    mode = await rc.prompter.select(
      message,
      choices.map((c) => ({ value: c.value, name: c.label }))
    );
  }

  if (mode === "none" && wantsCloud) {
    throw new CliError(
      "PUCK-CLI-BACKEND-REQUIRED",
      "Puck Cloud and Puck AI need a server. Use --backend add or --backend external.",
      { choices: choices.map((c) => c.value) }
    );
  }

  let url = rc.flags.backendUrl;
  if (mode === "external" && !url) {
    if (!rc.interactive) {
      throw new CliError(
        "PUCK-CLI-BACKEND-URL-REQUIRED",
        "--backend external needs --backend-url, the origin of the server that serves /api/pages and /api/puck.",
        { fix: `${rerunCommand(rc)} --backend-url http://localhost:3000` }
      );
    }
    url = (
      await rc.prompter.input("Server URL", {
        default: "http://localhost:3000",
        validate: (v) =>
          /^https?:\/\/[^/]/.test(v) ? true : "Enter an http(s) URL",
      })
    ).replace(/\/+$/, "");
  }

  return { kind: "resolved", backend: { mode, url } };
};
