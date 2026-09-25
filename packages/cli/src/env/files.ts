import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { KeySource } from "../result";
import { ENV_KEY } from "../constants";
import { parseEnv } from "./dotenv";

/**
 * Files loaded in development by both Next.js and React Router (via Vite's
 * loadEnv), highest precedence first. Values already present in the process
 * environment win over all of them.
 */
export const DEV_ENV_FILES = [
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
] as const;

export type EnvFileName = (typeof DEV_ENV_FILES)[number];

export interface KeyLocation {
  present: boolean;
  source: KeySource | null;
  /** Absolute path of the env file the effective key came from */
  file: string | null;
  value: string | null;
}

export const findApiKey = (
  vfs: Vfs,
  envDir: string,
  processEnv: Record<string, string | undefined>
): KeyLocation => {
  const fromProcess = processEnv[ENV_KEY];
  if (fromProcess) {
    return {
      present: true,
      source: "process.env",
      file: null,
      value: fromProcess,
    };
  }

  for (const name of DEV_ENV_FILES) {
    const file = path.join(envDir, name);
    const text = vfs.readText(file);
    if (text === null) continue;
    const value = parseEnv(text)[ENV_KEY];
    if (value) return { present: true, source: name, file, value };
  }

  return { present: false, source: null, file: null, value: null };
};

export const isSharedEnvFile = (source: KeySource | null) =>
  source === ".env" || source === ".env.development";

export const isLocalEnvFile = (source: KeySource | null) =>
  source === ".env.local" || source === ".env.development.local";
