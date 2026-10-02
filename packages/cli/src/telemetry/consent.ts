import { randomUUID } from "node:crypto";
import type { CliDeps } from "../deps";
import { isTruthyEnv } from "../env/truthy";
import type { TelemetryConfig } from "./config";
import { TelemetryConfigStore, configDirFor } from "./config";

export type TelemetryReason =
  /** On, because nobody turned it off */
  | "default"
  /** `puck telemetry enable` */
  | "enabled"
  /** `puck telemetry disable` */
  | "disabled"
  | "PUCK_TELEMETRY_DISABLED"
  | "DO_NOT_TRACK"
  /** PUCK_CLOUD_URL points at a local platform */
  | "local-cloud"
  /** The config directory can't be written, so there's no stable ID */
  | "unwritable";

export interface Telemetry {
  enabled: boolean;
  reason: TelemetryReason;
  /** Set when enabled */
  anonymousId: string | null;
  /** PUCK_TELEMETRY_DEBUG: print events to stderr instead of sending them */
  debug: boolean;
  store: TelemetryConfigStore;
  config: TelemetryConfig;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isLocalUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
};

export const telemetryConsent = (
  env: Record<string, string | undefined>,
  config: TelemetryConfig,
  baseUrl: string
): { enabled: boolean; reason: TelemetryReason } => {
  if (isTruthyEnv(env.PUCK_TELEMETRY_DISABLED))
    return { enabled: false, reason: "PUCK_TELEMETRY_DISABLED" };
  if (isTruthyEnv(env.DO_NOT_TRACK))
    return { enabled: false, reason: "DO_NOT_TRACK" };
  if (config.enabled === false) return { enabled: false, reason: "disabled" };
  if (isLocalUrl(baseUrl) && !isTruthyEnv(env.PUCK_TELEMETRY_DEBUG))
    return { enabled: false, reason: "local-cloud" };
  return { enabled: true, reason: config.enabled ? "enabled" : "default" };
};

/**
 * Resolves whether this run sends telemetry, creating the anonymous ID on
 * first use. Environment opt-outs are checked before touching the disk.
 */
export const loadTelemetry = (deps: CliDeps, baseUrl: string): Telemetry => {
  const store = new TelemetryConfigStore(configDirFor(deps.env, deps.homedir));
  const debug = isTruthyEnv(deps.env.PUCK_TELEMETRY_DEBUG);
  const envOnly = telemetryConsent(deps.env, {}, baseUrl);
  const config =
    envOnly.reason === "PUCK_TELEMETRY_DISABLED" ||
    envOnly.reason === "DO_NOT_TRACK"
      ? {}
      : store.load();
  const consent = telemetryConsent(deps.env, config, baseUrl);
  const off = (reason: TelemetryReason): Telemetry => ({
    enabled: false,
    reason,
    anonymousId: null,
    debug,
    store,
    config,
  });

  if (!consent.enabled) return off(consent.reason);

  if (
    typeof config.anonymousId !== "string" ||
    !UUID.test(config.anonymousId)
  ) {
    config.anonymousId = randomUUID();
    try {
      store.save(config);
    } catch {
      return off("unwritable");
    }
  }

  return { ...consent, anonymousId: config.anonymousId, debug, store, config };
};
