#!/usr/bin/env node
// Runs the Puck CLI (@puckeditor/cli), which is installed as a dependency of
// @puckeditor/core, so `npx @puckeditor/core <command>` uses the version that
// ships with the installed package instead of fetching one.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("@puckeditor/cli/package.json");
const { bin } = require(pkgPath);
const binPath = path.join(
  path.dirname(pkgPath),
  typeof bin === "string" ? bin : bin.puck
);

const { status, signal } = spawnSync(
  process.execPath,
  [binPath, ...process.argv.slice(2)],
  { stdio: "inherit" }
);

if (signal) process.kill(process.pid, signal);

process.exit(status ?? 1);
