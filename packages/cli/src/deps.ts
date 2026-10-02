import type { CommandRunner } from "./io/runner";
import type { Prompter } from "./io/prompter";
import type { TemplateSource } from "./templates/source";
import type { DocsSource } from "./docs/source";
import type { RunDevServer } from "./io/dev-server";

export interface OutputStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

/** Everything the CLI touches outside of the file system, injectable for tests */
export interface CliDeps {
  cwd: string;
  env: Record<string, string | undefined>;
  stdout: OutputStream;
  stderr: OutputStream;
  stdinIsTTY: boolean;
  cliVersion: string;
  runner: CommandRunner;
  fetch: typeof fetch;
  openUrl(url: string): Promise<boolean>;
  runDevServer: RunDevServer;
  createPrompter(): Prompter;
  templates: TemplateSource;
  docs: DocsSource;
  homedir: string;
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  now(): number;
  sleep(ms: number): Promise<void>;
}
