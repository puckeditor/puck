import fs from "node:fs";
import path from "node:path";

export interface TelemetryConfig {
  /** false after `puck telemetry disable`, true after `enable`, unset by default */
  enabled?: boolean;
  anonymousId?: string;
  /** When the first-run notice was shown, as an ISO date */
  notifiedAt?: string;
}

/**
 * The developer's telemetry choice and anonymous ID, shared by every project
 * on the machine.
 */
export class TelemetryConfigStore {
  #file: string;

  constructor(configDir: string) {
    this.#file = path.join(configDir, "puck", "telemetry.json");
  }

  get path() {
    return this.#file;
  }

  load(): TelemetryConfig {
    try {
      const data = JSON.parse(fs.readFileSync(this.#file, "utf8"));
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  /** Throws if the config directory isn't writable */
  save(config: TelemetryConfig) {
    fs.mkdirSync(path.dirname(this.#file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(this.#file, JSON.stringify(config, null, 2) + "\n", {
      mode: 0o600,
    });
  }
}

export const configDirFor = (
  env: Record<string, string | undefined>,
  homedir: string
) => env.XDG_CONFIG_HOME || path.join(homedir, ".config");
