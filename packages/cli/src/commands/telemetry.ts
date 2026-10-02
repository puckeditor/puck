import type { RunContext } from "../context";
import type { CommandResult } from "../result";
import type { TelemetryReason } from "../telemetry/consent";
import { emptyResult } from "../result";
import { CliError } from "../errors";
import { CANONICAL_INVOCATION } from "../constants";
import { telemetryConsent } from "../telemetry/consent";
import { TelemetryConfigStore, configDirFor } from "../telemetry/config";

const SUBCOMMANDS = ["status", "enable", "disable"];

const DISABLE = `\`${CANONICAL_INVOCATION} telemetry disable\``;

const MESSAGES: Record<TelemetryReason, string> = {
  default: `Telemetry is on. Turn it off with ${DISABLE}.`,
  enabled: `Telemetry is on. Turn it off with ${DISABLE}.`,
  disabled: "Telemetry is off.",
  PUCK_TELEMETRY_DISABLED:
    "Telemetry is off because PUCK_TELEMETRY_DISABLED is set.",
  DO_NOT_TRACK: "Telemetry is off because DO_NOT_TRACK is set.",
  unwritable: "Telemetry is off because its config file can't be written.",
};

/** `puck telemetry [status|enable|disable]`. Never sends an event itself. */
export const runTelemetry = async (
  rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  const [sub = "status", ...rest] = positionals;
  if (rest.length > 0 || !SUBCOMMANDS.includes(sub)) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `Usage: \`${CANONICAL_INVOCATION} telemetry [status|enable|disable]\`.`
    );
  }

  const { env, homedir } = rc.deps;
  const store = new TelemetryConfigStore(configDirFor(env, homedir));
  const config = store.load();
  const result = emptyResult("telemetry");

  if (sub !== "status") {
    const enabled = sub === "enable";
    result.changed = config.enabled !== enabled;
    config.enabled = enabled;
    // Re-enabling starts a new anonymous ID
    if (!enabled) delete config.anonymousId;
    try {
      store.save(config);
    } catch (err) {
      throw new CliError(
        "PUCK-CLI-WRITE-FAILED",
        `Couldn't save ${store.path}: ${(err as Error).message}`
      );
    }
  }

  const consent = telemetryConsent(env, config);
  result.telemetry = {
    ...consent,
    anonymousId: consent.enabled ? config.anonymousId ?? null : null,
  };
  result.message =
    sub === "enable" && !consent.enabled
      ? `Telemetry is enabled in ${store.path}, but stays off: ${MESSAGES[
          consent.reason
        ].replace("Telemetry is off because ", "")}`
      : MESSAGES[consent.reason];
  return result;
};
