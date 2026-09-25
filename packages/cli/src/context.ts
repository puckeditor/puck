import type { CliDeps } from "./deps";
import type { Flags } from "./args";
import type { Prompter } from "./io/prompter";
import { nonInteractivePrompter } from "./io/prompter";
import { SecretRegistry } from "./secret";
import { CloudApi, createCloudApi } from "./auth/cloud-api";
import { DEFAULT_CLOUD_URL } from "./constants";

export interface RunContext {
  deps: CliDeps;
  flags: Flags;
  argv: string[];
  interactive: boolean;
  prompter: Prompter;
  secrets: SecretRegistry;
  cloud: CloudApi;
  /** Progress output for humans; silent in JSON mode */
  log(line: string): void;
  /** Runs after the result is printed, e.g. starting the dev server */
  afterOutput?: () => Promise<void>;
}

const isCI = (env: Record<string, string | undefined>) => {
  const ci = env.CI;
  return (
    ci !== undefined && ci !== "" && ci !== "0" && ci.toLowerCase() !== "false"
  );
};

export const createRunContext = (
  deps: CliDeps,
  flags: Flags,
  argv: string[]
): RunContext => {
  const interactive =
    !flags.yes &&
    !flags.json &&
    deps.stdinIsTTY &&
    Boolean(deps.stdout.isTTY) &&
    !isCI(deps.env);

  const secrets = new SecretRegistry();
  const baseUrl = deps.env.PUCK_CLOUD_URL || DEFAULT_CLOUD_URL;

  return {
    deps,
    flags,
    argv,
    interactive,
    prompter: interactive ? deps.createPrompter() : nonInteractivePrompter,
    secrets,
    cloud: createCloudApi(baseUrl, deps.fetch),
    log: (line) => {
      if (!flags.json) deps.stderr.write(secrets.scrub(line) + "\n");
    },
  };
};

/** The command to re-run after completing an action, without secrets */
export const rerunCommand = (rc: RunContext) => {
  const args: string[] = [];
  for (let i = 0; i < rc.argv.length; i++) {
    const arg = rc.argv[i];
    if (arg === "--api-key") {
      i++;
      continue;
    }
    if (arg.startsWith("--api-key=")) continue;
    args.push(/[\s"'$`]/.test(arg) ? JSON.stringify(arg) : arg);
  }
  return ["npx", "@puckeditor/cli", ...args].join(" ");
};
