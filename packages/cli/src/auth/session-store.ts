import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export interface StoredSession {
  baseUrl: string;
  deviceCode: string;
  userCode: string;
  verificationUriComplete: string;
  /** Epoch milliseconds */
  expiresAt: number;
  interval: number;
}

/**
 * Persists a pending connect session outside the repository so an agent can
 * re-run the same command after the developer approves in the browser.
 */
export class SessionStore {
  #file: string;

  constructor(cacheDir: string, projectRoot: string, baseUrl: string) {
    const key = createHash("sha256")
      .update(`${projectRoot}\n${baseUrl}`)
      .digest("hex")
      .slice(0, 32);
    this.#file = path.join(cacheDir, "puck", "connect", `${key}.json`);
  }

  get path() {
    return this.#file;
  }

  load(): StoredSession | null {
    try {
      const data = JSON.parse(fs.readFileSync(this.#file, "utf8"));
      return typeof data?.deviceCode === "string" ? data : null;
    } catch {
      return null;
    }
  }

  save(session: StoredSession) {
    fs.mkdirSync(path.dirname(this.#file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(this.#file, JSON.stringify(session), { mode: 0o600 });
  }

  clear() {
    fs.rmSync(this.#file, { force: true });
  }
}

export const cacheDirFor = (
  env: Record<string, string | undefined>,
  homedir: string
) => env.XDG_CACHE_HOME || path.join(homedir, ".cache");
