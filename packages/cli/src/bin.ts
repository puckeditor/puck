import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { runCli } from "./cli";
import { createRunner } from "./io/runner";
import { openUrl } from "./io/open-url";
import { runDevServer } from "./io/dev-server";
import { createInquirerPrompter } from "./io/prompter";
import { DirTemplateSource } from "./templates/source";
import { DirDocsSource } from "./docs/source";

declare const __CLI_VERSION__: string;

const distDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(distDir, "templates");

const templates = new DirTemplateSource(templatesDir, {
  gitignoreName: "_gitignore",
  manifest: () =>
    JSON.parse(
      fs.readFileSync(path.join(templatesDir, "manifest.json"), "utf8")
    ),
});

const env = { ...process.env };

runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  env,
  stdout: process.stdout,
  stderr: process.stderr,
  stdinIsTTY: Boolean(process.stdin.isTTY),
  cliVersion: __CLI_VERSION__,
  runner: createRunner(env),
  fetch: globalThis.fetch,
  openUrl,
  runDevServer,
  createPrompter: () => createInquirerPrompter(process.stderr),
  templates,
  docs: new DirDocsSource(path.join(distDir, "docs")),
  homedir: os.homedir(),
  hostname: os.hostname(),
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`${err?.stack ?? err}\n`);
    process.exitCode = 1;
  }
);
