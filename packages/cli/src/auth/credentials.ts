import type { RunContext } from "../context";
import type { KeySource, RequiredAction } from "../result";
import type { ProjectState } from "../detect/state";
import type { KeyCheck } from "./cloud-api";
import { CloudRequestError } from "./cloud-api";
import { isValidApiKeyFormat, Secret } from "../secret";
import { CliError } from "../errors";
import { API_KEYS_PATH, ENV_KEY } from "../constants";
import { rerunCommand } from "../context";
import { SessionStore, cacheDirFor } from "./session-store";

export interface ClientInfo {
  projectName?: string;
  framework?: string;
  projectRoot: string;
  /** The branch to connect to, when not the project's default */
  branch?: string;
}

export type CredentialResolution =
  | {
      kind: "resolved";
      secret: Secret;
      source: KeySource;
      /** Whether the key needs writing to an env file */
      needsWrite: boolean;
      verified: KeyCheck | "skipped";
      warnings: { code: string; message: string }[];
    }
  | {
      kind: "action";
      action: RequiredAction;
      warnings: { code: string; message: string }[];
    }
  | {
      kind: "none";
      reason: "no-env-write" | "dry-run";
      warnings: { code: string; message: string }[];
    };

const apiKeysUrl = (rc: RunContext) =>
  new URL(API_KEYS_PATH, rc.cloud.baseUrl).toString();

const provideKeyAction = (rc: RunContext, message: string): RequiredAction => ({
  id: "cloud:api-key",
  type: "provide_api_key",
  required: true,
  message,
  url: apiKeysUrl(rc),
  instructions: `Create an API key at ${apiKeysUrl(
    rc
  )}, then re-run with ${ENV_KEY}=<key> in the environment or --api-key <key>.`,
  flag: "--api-key",
  env: "PUCK_API_KEY",
  rerun: rerunCommand(rc),
});

const secretFrom = (rc: RunContext, value: string, source: string) => {
  const trimmed = value.trim();
  if (!isValidApiKeyFormat(trimmed)) {
    throw new CliError(
      "PUCK-CLI-INVALID-API-KEY",
      `The API key from ${source} isn't a valid Puck API key.`
    );
  }
  rc.secrets.add(trimmed);
  return new Secret(trimmed);
};

const verify = async (
  rc: RunContext,
  secret: Secret
): Promise<KeyCheck | "skipped"> =>
  rc.flags.dryRun ? "skipped" : rc.cloud.verifyKey(secret.reveal());

const clientPayload = (rc: RunContext, info: ClientInfo) => ({
  cliVersion: rc.deps.cliVersion,
  hostname: rc.deps.hostname.slice(0, 100),
  projectName: info.projectName?.slice(0, 100),
  framework: info.framework,
  branch: info.branch,
  anonymousId: rc.telemetry?.anonymousId ?? undefined,
});

type Approved = {
  apiKey: string;
  keyName: string;
  organization: { name: string };
};

const onApproved = (
  rc: RunContext,
  approved: Approved
): CredentialResolution => {
  const secret = secretFrom(rc, approved.apiKey, "Puck Cloud");
  rc.log(
    `✓ Connected to ${approved.organization.name} (key "${approved.keyName}")`
  );
  return {
    kind: "resolved",
    secret,
    source: "connect",
    needsWrite: true,
    verified: "valid",
    warnings: [],
  };
};

const loginAction = (
  rc: RunContext,
  session: {
    verificationUriComplete: string;
    userCode: string;
    expiresAt: number;
  }
): RequiredAction => ({
  id: "cloud:login",
  type: "browser_login",
  required: true,
  message:
    "Ask the developer to log in to Puck Cloud and approve this project.",
  url: session.verificationUriComplete,
  userCode: session.userCode,
  expiresAt: new Date(session.expiresAt).toISOString(),
  instructions: `Open ${session.verificationUriComplete}, confirm the code ${session.userCode}, and approve. Then re-run the same command.`,
  rerun: rerunCommand(rc),
});

const connectFallback = (
  rc: RunContext,
  err: unknown
): CredentialResolution => {
  if (err instanceof CloudRequestError && err.kind === "rate_limited") {
    throw new CliError("PUCK-CLI-CONNECT-FAILED", err.message);
  }
  const reason = err instanceof Error ? err.message : String(err);
  return {
    kind: "action",
    action: provideKeyAction(
      rc,
      `Couldn't start a Puck Cloud login (${reason}). Provide an API key instead.`
    ),
    warnings: [],
  };
};

/**
 * Agent-friendly device flow: start (or resume) a connect session, poll it,
 * and return a browser_login action while it's pending. The pending session
 * is stored outside the repo so a re-run picks it up.
 */
const connectNonInteractive = async (
  rc: RunContext,
  info: ClientInfo,
  attempt = 0
): Promise<CredentialResolution> => {
  const store = new SessionStore(
    cacheDirFor(rc.deps.env, rc.deps.homedir),
    info.projectRoot,
    rc.cloud.baseUrl
  );
  let session = store.load();

  // A login started for another branch would mint a key for that branch
  if (session && session.branch !== info.branch) {
    store.clear();
    session = null;
  }

  if (session && session.expiresAt <= rc.deps.now()) {
    store.clear();
    session = null;
  }

  if (!session) {
    try {
      const started = await rc.cloud.startConnect(clientPayload(rc, info));
      session = {
        baseUrl: rc.cloud.baseUrl,
        deviceCode: started.deviceCode,
        userCode: started.userCode,
        verificationUriComplete: started.verificationUriComplete,
        expiresAt: rc.deps.now() + started.expiresIn * 1000,
        interval: started.interval,
        branch: info.branch,
      };
      store.save(session);
      if (!rc.flags.wait)
        return {
          kind: "action",
          action: loginAction(rc, session),
          warnings: [],
        };
    } catch (err) {
      return connectFallback(rc, err);
    }
  }

  for (;;) {
    let result;
    try {
      result = await rc.cloud.pollConnect(session.deviceCode);
    } catch (err) {
      return connectFallback(rc, err);
    }

    if (result.status === "approved") {
      store.clear();
      return onApproved(rc, result);
    }

    if (
      result.status === "denied" ||
      result.status === "expired" ||
      result.status === "invalid"
    ) {
      store.clear();
      if (result.status === "denied") {
        throw new CliError(
          "PUCK-CLI-CONNECT-FAILED",
          "The Puck Cloud connection was denied."
        );
      }
      if (attempt > 0) {
        throw new CliError(
          "PUCK-CLI-CONNECT-FAILED",
          "The Puck Cloud login session could not be completed."
        );
      }
      // Start a fresh session
      return connectNonInteractive(rc, info, attempt + 1);
    }

    if (result.status === "error") {
      // Keep the session: the platform releases failed claims, so a re-run retries
      throw new CliError(
        "PUCK-CLI-CONNECT-FAILED",
        `${result.message}. Re-run the command to try again.`
      );
    }

    if (!rc.flags.wait || session.expiresAt <= rc.deps.now()) {
      return { kind: "action", action: loginAction(rc, session), warnings: [] };
    }

    const interval =
      result.status === "slow_down" ? session.interval + 5 : session.interval;
    await rc.deps.sleep(interval * 1000);
  }
};

const MAX_POLL_FAILURES = 3;

const connectInteractive = async (
  rc: RunContext,
  info: ClientInfo
): Promise<CredentialResolution | null> => {
  let session;
  try {
    session = await rc.cloud.startConnect(clientPayload(rc, info));
  } catch (err) {
    rc.log(`✗ ${(err as Error).message}`);
    return null;
  }

  rc.log("");
  rc.log(`  Open ${session.verificationUriComplete}`);
  rc.log(`  and confirm the code ${session.userCode}`);
  rc.log("");
  await rc.deps.openUrl(session.verificationUriComplete);
  rc.log("Waiting for approval in the browser…");

  const expiresAt = rc.deps.now() + session.expiresIn * 1000;
  let interval = session.interval;
  let failures = 0;

  while (rc.deps.now() < expiresAt) {
    await rc.deps.sleep(interval * 1000);
    const result = await rc.cloud
      .pollConnect(session.deviceCode)
      .catch((err: Error) => ({
        status: "error" as const,
        message: err.message,
      }));

    if (result.status === "pending") continue;
    if (result.status === "slow_down") {
      interval += 5;
      continue;
    }
    if (result.status === "approved") return onApproved(rc, result);
    if (result.status === "denied") {
      throw new CliError(
        "PUCK-CLI-CONNECT-FAILED",
        "The Puck Cloud connection was denied."
      );
    }
    if (result.status === "error") {
      // The platform releases a failed claim, so a later poll can still succeed
      if (++failures < MAX_POLL_FAILURES) {
        rc.log(`! ${result.message}. Retrying…`);
        continue;
      }
      rc.log(`✗ ${result.message}.`);
      return null;
    }

    rc.log(
      `✗ The login ${
        result.status === "expired" ? "expired" : "is no longer valid"
      }.`
    );
    return null;
  }

  rc.log("✗ The login link expired.");
  return null;
};

const promptForKey = async (rc: RunContext): Promise<CredentialResolution> => {
  const url = apiKeysUrl(rc);
  if (await rc.prompter.confirm(`Open ${url} to create an API key?`, true)) {
    await rc.deps.openUrl(url);
  }
  rc.log(`Create a key at ${url}`);
  const value = await rc.prompter.password("Paste your Puck API key");
  const secret = secretFrom(rc, value, "the prompt");
  const verified = await verify(rc, secret);
  if (verified === "invalid") {
    throw new CliError(
      "PUCK-CLI-API-KEY-REJECTED",
      "Puck Cloud rejected that API key."
    );
  }
  return {
    kind: "resolved",
    secret,
    source: "prompt",
    needsWrite: true,
    verified,
    warnings: [],
  };
};

export const resolveCredential = async (
  rc: RunContext,
  state: ProjectState,
  info: ClientInfo,
  /** Log in again even if a key is already set, e.g. for `connect` */
  { fresh = false }: { fresh?: boolean } = {}
): Promise<CredentialResolution> => {
  const warnings: { code: string; message: string }[] = [];

  const fromExplicit = async (
    value: string,
    source: "flag" | "process.env"
  ): Promise<CredentialResolution> => {
    const secret = secretFrom(
      rc,
      value,
      source === "flag" ? "--api-key" : ENV_KEY
    );
    const verified = await verify(rc, secret);
    if (verified === "invalid") {
      throw new CliError(
        "PUCK-CLI-API-KEY-REJECTED",
        `Puck Cloud rejected the API key from ${
          source === "flag" ? "--api-key" : ENV_KEY
        }.`
      );
    }
    return {
      kind: "resolved",
      secret,
      source,
      needsWrite: !rc.flags.noEnvWrite,
      verified,
      warnings,
    };
  };

  if (rc.flags.apiKey !== undefined)
    return fromExplicit(rc.flags.apiKey, "flag");
  if (fresh && rc.deps.env[ENV_KEY]) {
    warnings.push({
      code: "PUCK-CLI-W-KEY-IN-PROCESS-ENV",
      message: `${ENV_KEY} is set in your environment and overrides the new key in the env file. Unset it to use the new key.`,
    });
  } else if (rc.deps.env[ENV_KEY])
    return fromExplicit(rc.deps.env[ENV_KEY]!, "process.env");

  const existing = state.cloud.apiKey;
  if (!fresh && existing.present && existing.value) {
    const secret = secretFrom(
      rc,
      existing.value,
      existing.source ?? "env file"
    );
    const verified = await verify(rc, secret);
    if (verified !== "invalid") {
      return {
        kind: "resolved",
        secret,
        source: existing.source!,
        needsWrite: false,
        verified,
        warnings,
      };
    }
    warnings.push({
      code: "PUCK-CLI-W-KEY-REJECTED",
      message: `Puck Cloud rejected the ${ENV_KEY} in ${existing.source}, so a new key is needed.`,
    });
  }

  if (rc.flags.noEnvWrite)
    return { kind: "none", reason: "no-env-write", warnings };
  if (rc.flags.dryRun) return { kind: "none", reason: "dry-run", warnings };

  if (rc.interactive) {
    const method = await rc.prompter.select(
      "How do you want to connect to Puck Cloud?",
      [
        { value: "login", name: "Log in with the browser (recommended)" },
        { value: "paste", name: "Paste an existing API key" },
      ]
    );
    if (method === "login") {
      const connected = await connectInteractive(rc, info);
      if (connected) return { ...connected, warnings };
      rc.log("Falling back to pasting an API key.");
    }
    const pasted = await promptForKey(rc);
    return { ...pasted, warnings };
  }

  // Starting a login is a side effect, so it needs the same consent as changes
  if (!rc.flags.yes) {
    return {
      kind: "action",
      warnings,
      action: {
        id: "confirm",
        type: "confirm_plan",
        required: true,
        flag: "--yes",
        message: "Re-run with --yes to log in to Puck Cloud.",
        rerun: `${rerunCommand(rc)} --yes`,
      },
    };
  }

  const resolution = await connectNonInteractive(rc, info);
  return { ...resolution, warnings: [...warnings, ...resolution.warnings] };
};
