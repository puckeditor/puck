import type { CliDeps } from "../deps";
import type { Telemetry } from "./consent";
import type { TelemetryEvent } from "./event";

/** Telemetry must never hold up the CLI for long */
const TIMEOUT_MS = 1_000;

/** Sends events to Puck Cloud. Never throws. */
export const sendTelemetry = async (
  deps: CliDeps,
  baseUrl: string,
  telemetry: Telemetry,
  events: TelemetryEvent[]
) => {
  if (!telemetry.enabled || !telemetry.anonymousId) return;
  const body = JSON.stringify({ anonymousId: telemetry.anonymousId, events });

  if (telemetry.debug) {
    deps.stderr.write(`[telemetry] ${body}\n`);
    return;
  }

  try {
    await deps.fetch(
      new URL(
        "api/cli/telemetry",
        baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
      ),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
  } catch {
    // Offline, blocked or slow: drop the event
  }
};
