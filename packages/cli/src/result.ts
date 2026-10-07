import type { CliErrorPayload } from "./errors";
import type { PackageManagerName } from "./detect/package-manager";
import type { FrameworkId } from "./detect/framework";
import type { BackendChoice } from "./args";
import type { DocEntry } from "./docs/source";
import type { TelemetryReason } from "./telemetry/consent";

export type CommandName =
  | "init"
  | "add"
  | "connect"
  | "status"
  | "doctor"
  | "docs"
  | "frameworks"
  | "telemetry"
  | "pages"
  | "help";

export type ResultStatus = "success" | "action_required" | "partial" | "error";

export type CapabilityId = "editor" | "cloud" | "ai" | "pages" | "auth";

export type KeySource =
  | "flag"
  | "process.env"
  | "prompt"
  | "connect"
  | ".env.development.local"
  | ".env.local"
  | ".env.development"
  | ".env";

interface ActionBase {
  id: string;
  required: boolean;
  message: string;
  /** Literal command to run once the action is complete */
  rerun?: string;
}

export type RequiredAction = ActionBase &
  (
    | {
        type: "browser_login";
        url: string;
        userCode: string;
        expiresAt: string;
        instructions: string;
      }
    | {
        type: "provide_api_key";
        url: string;
        instructions: string;
        flag: "--api-key";
        env: "PUCK_API_KEY";
      }
    | {
        type: "choose_framework";
        flag: "--framework";
        choices: { value: FrameworkId; label: string }[];
      }
    | {
        type: "choose_workspace_package";
        flag: "--workspace";
        choices: { value: string; label: string }[];
      }
    | { type: "provide_app_name"; flag: "--name"; suggested: string }
    | {
        type: "choose_ai";
        choices: { value: "--ai" | "--no-ai"; label: string }[];
      }
    | {
        type: "choose_backend";
        flag: "--backend";
        choices: { value: BackendChoice; label: string }[];
      }
    | { type: "confirm_plan"; flag: "--yes" }
    | {
        type: "manual_edit";
        capability: CapabilityId;
        file: string;
        reason: "conflict" | "unsupported_shape" | "optional";
        instructions: string;
        snippet?: string;
      }
    | {
        type: "set_environment_variable";
        name: "PUCK_API_KEY";
        instructions: string;
      }
    | { type: "run_command"; command: string; reason: string }
  );

export interface Warning {
  code: string;
  message: string;
}

export interface SerializedStep {
  id: string;
  kind: string;
  capability: string;
  summary: string;
  path?: string;
  command?: string;
  packages?: string[];
  edits?: { line: number; insert: string }[];
  files?: number;
}

export interface DoctorFinding {
  check: string;
  status: "ok" | "warn" | "fail" | "skip";
  evidence: string;
  fix: string | null;
}

export interface WorkspaceSummary {
  root: string;
  manager: PackageManagerName;
  target: { name: string | null; dir: string } | null;
  packages: {
    name: string | null;
    dir: string;
    framework: FrameworkId | null;
    puck: boolean;
    cloud: boolean;
  }[];
}

export interface ProjectSummary {
  root: string;
  framework: FrameworkId | null;
  frameworkVersion: string | null;
  appDir: string | null;
  packageManager: PackageManagerName;
  typescript: boolean;
  workspace: WorkspaceSummary | null;
}

export interface PuckSummary {
  installed: boolean;
  version: string | null;
  configured: boolean;
  configFile: string | null;
  editorFiles: string[];
}

export interface CloudSummary {
  installed: boolean;
  routeFile: string | null;
  configured: boolean;
  apiKey: { present: boolean; source: KeySource | null };
  verified: "remote" | "local" | "failed" | "none";
}

export interface AiSummary {
  installed: boolean;
  configured: boolean;
}

export interface PagesSummary {
  installed: boolean;
  configured: boolean;
}

export interface AuthSummary {
  installed: boolean;
  configured: boolean;
}

export interface FrameworkSupport {
  /** The value for `--framework` */
  id: FrameworkId;
  name: string;
  /** Oldest supported version, as "major" or "major.minor" */
  minVersion: string;
  /**
   * "app" frameworks get the editor. "server" frameworks serve the pages and
   * Puck Cloud APIs for an editor in another app.
   */
  kind: "app" | "server";
  /** Puck Cloud and Puck AI need a server, chosen with `--backend` */
  needsServer: boolean;
  notes: string;
}

export interface CommandResult {
  schemaVersion: 1;
  command: CommandName;
  status: ResultStatus;
  changed: boolean;
  dryRun: boolean;
  message: string;
  project: ProjectSummary | null;
  puck: PuckSummary | null;
  cloud: CloudSummary | null;
  ai: AiSummary | null;
  pages: PagesSummary | null;
  auth: AuthSummary | null;
  plan?: { steps: SerializedStep[] };
  filesModified: string[];
  filesCreated: string[];
  packagesInstalled: string[];
  actions: RequiredAction[];
  warnings: Warning[];
  findings?: DoctorFinding[];
  summary?: { ok: number; warn: number; fail: number; skip: number };
  nextSteps: string[];
  error?: CliErrorPayload;
  /** Present on `puck` / `puck --help` */
  commands?: { name: string; description: string }[];
  /** Present on `puck frameworks` */
  frameworks?: FrameworkSupport[];
  /** Present on `puck docs` */
  docs?: {
    pages?: DocEntry[];
    page?: DocEntry & { content: string };
    matches?: { path: string; line: number; text: string }[];
  };
  /** Present on `puck pages import` */
  pagesImport?: {
    /** The imported file, relative to where the command ran */
    file: string;
    total: number;
    created: string[];
    /** Routes that already had a page in Puck Cloud */
    skipped: string[];
    /** Routes not sent because an earlier batch failed */
    notImported: string[];
  };
  /** Present on `puck telemetry` */
  telemetry?: {
    enabled: boolean;
    reason: TelemetryReason;
    anonymousId: string | null;
  };
}

export const emptyResult = (
  command: CommandName,
  dryRun = false
): CommandResult => ({
  schemaVersion: 1,
  command,
  status: "success",
  changed: false,
  dryRun,
  message: "",
  project: null,
  puck: null,
  cloud: null,
  ai: null,
  pages: null,
  auth: null,
  filesModified: [],
  filesCreated: [],
  packagesInstalled: [],
  actions: [],
  warnings: [],
  nextSteps: [],
});
