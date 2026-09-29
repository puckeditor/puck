import type { CommandResult } from "./result";
import { emptyResult } from "./result";
import { CANONICAL_INVOCATION, DOCS_URL } from "./constants";
import { FRAMEWORK_IDS } from "./detect/framework";

export const COMMANDS = [
  {
    name: "init",
    description:
      "Set up Puck in this project or create a new app, optionally with Puck AI",
  },
  {
    name: "add <editor|cloud|ai>",
    description:
      "Add one capability (ai includes cloud, cloud includes editor)",
  },
  { name: "status", description: "Show what's installed and configured" },
  {
    name: "doctor",
    description: "Diagnose problems and suggest fixes (read-only)",
  },
  {
    name: "frameworks",
    description: "Show the supported frameworks and versions",
  },
  {
    name: "docs <command>",
    description:
      "Read the docs for this version: ls, cat <page>, find <query>, grep <text>",
  },
];

export const HELP_TEXT = `Puck CLI: set up Puck and Puck Cloud.

Run this first:
  ${CANONICAL_INVOCATION} status --json
  Shows what's already set up and the next command to run.

Set everything up:
  ${CANONICAL_INVOCATION} init              Interactive
  ${CANONICAL_INVOCATION} init --yes --json For agents: no prompts, one JSON document on stdout

Commands:
${COMMANDS.map((c) => `  ${c.name.padEnd(20)} ${c.description}`).join("\n")}

Flags:
  --json                  Machine-readable output (no colors, no prompts)
  -y, --yes               Accept the plan without prompting
  --dry-run               Show the plan without changing anything
  --cwd <path>            Run against another directory
  --workspace <name|dir>  Choose an app when run from a monorepo root
  --api-key <key>         Use an existing Puck API key (prefer PUCK_API_KEY=… in the environment)
  --no-env-write          Don't write PUCK_API_KEY to .env.local
  --ai                    Also set up Puck AI and Puck Cloud (init)
  --no-ai                 Set up the editor only, without asking about Puck AI (init)
  --backend <add|external|none>  Where a Vite or static Astro app gets its server:
                          add one, use one elsewhere, or none (editor only)
  --backend-url <url>     The server for --backend external, e.g. http://localhost:3000
  --wait                  Wait for Puck Cloud login approval instead of returning
  --framework <name>      Framework for new apps (init), one of:
                          ${FRAMEWORK_IDS.join(", ")}
  --name <name>           Directory name for new apps (init)
  --package-manager <pnpm|npm|yarn|bun>

For agents:
  Every command prints exactly one JSON document with --json. When "status" is
  "action_required", surface each entry in "actions" to the developer (e.g. a
  browser_login URL and code), then run its "rerun" command. Exit codes:
  0 success, 2 usage, 3 unsupported project, 4 file conflict, 5 package manager,
  6 doctor found problems, 7 Puck Cloud unreachable, 10 action required, 11 partial.

  The docs for this version ship with the CLI. Start with:
  ${CANONICAL_INVOCATION} docs cat getting-started

Docs: ${DOCS_URL}
`;

export const helpResult = (): CommandResult => ({
  ...emptyResult("help"),
  message: "Puck CLI",
  commands: COMMANDS,
  nextSteps: [`${CANONICAL_INVOCATION} status --json`],
});
