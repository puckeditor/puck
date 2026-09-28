import { parseArgs } from "node:util";
import { CliError } from "./errors";
import type { CommandName } from "./result";
import type { FrameworkId } from "./detect/framework";
import { FRAMEWORK_IDS } from "./detect/framework";
import { PACKAGE_MANAGERS, PackageManagerName } from "./detect/package-manager";

export interface Flags {
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
  cwd?: string;
  workspace?: string;
  apiKey?: string;
  noEnvWrite: boolean;
  config?: string;
  packageManager?: PackageManagerName;
  wait: boolean;
  framework?: FrameworkId;
  name?: string;
  offline: boolean;
  ai: boolean;
  noAi: boolean;
  backend?: BackendChoice;
  backendUrl?: string;
}

/** Where a client-only app (Vite, static Astro) gets its server from */
export type BackendChoice = "add" | "external" | "none";

export const BACKEND_CHOICES: BackendChoice[] = ["add", "external", "none"];

export interface ParsedArgs {
  command: CommandName | null;
  positionals: string[];
  flags: Flags;
}

const OPTIONS = {
  json: { type: "boolean" },
  yes: { type: "boolean", short: "y" },
  "dry-run": { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  cwd: { type: "string" },
  workspace: { type: "string" },
  "api-key": { type: "string" },
  "no-env-write": { type: "boolean" },
  config: { type: "string" },
  "package-manager": { type: "string" },
  wait: { type: "boolean" },
  framework: { type: "string" },
  name: { type: "string" },
  offline: { type: "boolean" },
  ai: { type: "boolean" },
  "no-ai": { type: "boolean" },
  backend: { type: "string" },
  "backend-url": { type: "string" },
} as const;

type OptionName = keyof typeof OPTIONS;

const GLOBAL: OptionName[] = [
  "json",
  "yes",
  "dry-run",
  "help",
  "version",
  "cwd",
  "workspace",
];
const MUTATING: OptionName[] = [
  "api-key",
  "no-env-write",
  "config",
  "package-manager",
  "wait",
  "backend",
  "backend-url",
];

export const COMMAND_OPTIONS: Record<CommandName, OptionName[]> = {
  init: [...GLOBAL, ...MUTATING, "framework", "name", "ai", "no-ai"],
  add: [...GLOBAL, ...MUTATING],
  status: ["json", "help", "version", "cwd", "workspace", "config"],
  doctor: ["json", "help", "version", "cwd", "workspace", "config", "offline"],
  docs: ["json", "help", "version"],
  help: GLOBAL,
};

const COMMANDS: CommandName[] = [
  "init",
  "add",
  "status",
  "doctor",
  "docs",
  "help",
];
const FRAMEWORKS: readonly string[] = FRAMEWORK_IDS;

export const parseCliArgs = (argv: string[]): ParsedArgs => {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      (err as Error).message.replace(/\. To specify.*$/s, ".")
    );
  }

  const [first, ...positionals] = parsed.positionals;
  let command: CommandName | null = null;
  if (first !== undefined) {
    if (!COMMANDS.includes(first as CommandName)) {
      throw new CliError(
        "PUCK-CLI-UNKNOWN-COMMAND",
        `Unknown command "${first}". Run \`puck --help\` to see available commands.`
      );
    }
    command = first as CommandName;
  }

  const values = parsed.values as Record<string, string | boolean | undefined>;
  const allowed = COMMAND_OPTIONS[command ?? "help"];
  for (const key of Object.keys(values)) {
    if (!allowed.includes(key as OptionName)) {
      throw new CliError(
        "PUCK-CLI-INVALID-ARGS",
        `--${key} can't be used with \`${command ?? "puck"}\`.`
      );
    }
  }

  const pm = values["package-manager"] as string | undefined;
  if (
    pm !== undefined &&
    !PACKAGE_MANAGERS.includes(pm as PackageManagerName)
  ) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `--package-manager must be one of ${PACKAGE_MANAGERS.join(", ")}.`
    );
  }

  const framework = values.framework as string | undefined;
  if (framework !== undefined && !FRAMEWORKS.includes(framework)) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `--framework must be one of ${FRAMEWORKS.join(", ")}.`
    );
  }

  const backend = values.backend as string | undefined;
  if (
    backend !== undefined &&
    !BACKEND_CHOICES.includes(backend as BackendChoice)
  ) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `--backend must be one of ${BACKEND_CHOICES.join(", ")}.`
    );
  }
  const backendUrl = values["backend-url"] as string | undefined;
  if (backendUrl !== undefined && !/^https?:\/\/[^/]/.test(backendUrl)) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      "--backend-url must be an http(s) URL, e.g. http://localhost:3000."
    );
  }

  if (values.ai && values["no-ai"]) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      "--ai and --no-ai can't be used together."
    );
  }

  return {
    command,
    positionals,
    flags: {
      json: Boolean(values.json),
      yes: Boolean(values.yes),
      dryRun: Boolean(values["dry-run"]),
      help: Boolean(values.help),
      version: Boolean(values.version),
      cwd: values.cwd as string | undefined,
      workspace: values.workspace as string | undefined,
      apiKey: values["api-key"] as string | undefined,
      noEnvWrite: Boolean(values["no-env-write"]),
      config: values.config as string | undefined,
      packageManager: pm as PackageManagerName | undefined,
      wait: Boolean(values.wait),
      framework: framework as FrameworkId | undefined,
      name: values.name as string | undefined,
      offline: Boolean(values.offline),
      ai: Boolean(values.ai),
      noAi: Boolean(values["no-ai"]),
      backend: backend as BackendChoice | undefined,
      backendUrl: backendUrl?.replace(/\/+$/, ""),
    },
  };
};

/** Best-effort JSON detection for errors thrown before parsing succeeds */
export const wantsJson = (argv: string[]) => argv.includes("--json");
