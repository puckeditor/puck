import type { Flags, BackendChoice } from "../args";
import type { CapabilityId, CommandName, CommandResult } from "../result";
import type { FrameworkId } from "../detect/framework";
import type { PackageManagerName } from "../detect/package-manager";
import { CAPABILITY_IDS } from "../plan/capabilities";
import { isCI } from "../context";

/**
 * One CLI run. Every field is an enum, boolean, number or version, never a
 * path, name, message or flag value. Keep in sync with the docs and the
 * platform's /api/cli/telemetry validation.
 */
export interface TelemetryEvent {
  event: "cli_command";
  timestamp: string;
  /** null when the arguments didn't parse */
  command: CommandName | null;
  /** What `add` was asked for */
  capabilities: CapabilityId[];
  status: CommandResult["status"];
  errorCode: string | null;
  exitCode: number;
  durationMs: number;
  dryRun: boolean;
  changed: boolean;
  /** RequiredAction types */
  actions: string[];
  /** Warning codes */
  warnings: string[];
  cliVersion: string;
  os: string;
  arch: string;
  nodeVersion: string;
  packageManager: PackageManagerName | null;
  ci: boolean;
  interactive: boolean;
  json: boolean;
  agent: string | null;
  framework: FrameworkId | null;
  frameworkMajor: number | null;
  monorepo: boolean;
  puck: boolean;
  cloud: boolean;
  ai: boolean;
  backend: BackendChoice | null;
}

/** Environment markers set by coding agents, mapped to a stable name */
const AGENTS: [env: string, name: string][] = [
  ["CLAUDECODE", "claude-code"],
  ["CURSOR_AGENT", "cursor"],
  ["CODEX_SANDBOX", "codex"],
  ["CODEX_SANDBOX_NETWORK_DISABLED", "codex"],
  ["GEMINI_CLI", "gemini-cli"],
  ["OPENCODE", "opencode"],
];

export const detectAgent = (env: Record<string, string | undefined>) =>
  AGENTS.find(([key]) => env[key] !== undefined && env[key] !== "")?.[1] ??
  null;

/** Drops anything that isn't a short identifier, as a last line of defence */
const id = (value: string | null | undefined) =>
  value && /^[A-Za-z0-9._@:-]{1,64}$/.test(value) ? value : null;
const ids = (values: string[]) =>
  values.map(id).filter((v): v is string => v !== null);

const major = (version: string | null | undefined) => {
  const match = version?.match(/\d+/);
  return match ? Number(match[0]) : null;
};

export interface EventInput {
  command: CommandName | null;
  positionals: string[];
  flags: Partial<Flags>;
  result: CommandResult;
  exitCode: number;
  durationMs: number;
  interactive: boolean;
  env: Record<string, string | undefined>;
  cliVersion: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  now: number;
}

export const buildEvent = (input: EventInput): TelemetryEvent => {
  const { result, flags } = input;
  const project = result.project;
  return {
    event: "cli_command",
    timestamp: new Date(input.now).toISOString(),
    command: input.command,
    capabilities:
      input.command === "add"
        ? CAPABILITY_IDS.filter((c) => input.positionals.includes(c))
        : [],
    status: result.status,
    errorCode: id(result.error?.code),
    exitCode: input.exitCode,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    dryRun: Boolean(flags.dryRun),
    changed: result.changed,
    actions: ids(result.actions.map((a) => a.type)),
    warnings: ids(result.warnings.map((w) => w.code)),
    cliVersion: id(input.cliVersion) ?? "unknown",
    os: id(input.platform) ?? "unknown",
    arch: id(input.arch) ?? "unknown",
    nodeVersion: id(input.nodeVersion) ?? "unknown",
    packageManager: project?.packageManager ?? flags.packageManager ?? null,
    ci: isCI(input.env),
    interactive: input.interactive,
    json: Boolean(flags.json),
    agent: detectAgent(input.env),
    framework: project?.framework ?? flags.framework ?? null,
    frameworkMajor: major(project?.frameworkVersion),
    monorepo: Boolean(project?.workspace),
    puck: Boolean(result.puck?.installed),
    cloud: Boolean(result.cloud?.installed),
    ai: Boolean(result.ai?.installed),
    backend: flags.backend ?? null,
  };
};
