import { parseArgs } from "node:util";
import type { CapabilityId, CommandName } from "../result";
import { BACKEND_CHOICES, COMMANDS, OPTIONS } from "../args";
import { FRAMEWORK_IDS } from "../detect/framework";
import { PACKAGE_MANAGERS } from "../detect/package-manager";
import { CAPABILITY_IDS } from "../plan/capabilities";
import { SUBCOMMANDS as DOCS_SUBCOMMANDS } from "../commands/docs";

const MAX_PARTS = 24;
const MAX_LENGTH = 256;

/** A word like `create`; never a path, placeholder or key */
export const word = (value: unknown) =>
  typeof value === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(value)
    ? value
    : null;

const OPTION_NAMES = new Set(Object.keys(OPTIONS));

/** Option values that are fixed choices. Every other value is free text */
const CHOICES: Record<string, readonly string[]> = {
  framework: FRAMEWORK_IDS,
  "package-manager": PACKAGE_MANAGERS,
  backend: BACKEND_CHOICES,
};

/** Arguments after the command that are fixed choices, by position */
const ARGUMENTS: Partial<
  Record<CommandName, (arg: string, index: number) => boolean>
> = {
  add: (arg) => CAPABILITY_IDS.includes(arg as CapabilityId),
  docs: (arg, index) =>
    index === 0 && (DOCS_SUBCOMMANDS as readonly string[]).includes(arg),
  pages: (arg, index) => index === 0 && arg === "import",
};

/**
 * The command as typed, e.g. `puck init --framework next --name <value>`.
 * Keeps commands, known flags and fixed choices; every other value and
 * argument becomes a placeholder.
 */
export const describeCommand = (argv: string[]) => {
  const { tokens } = parseArgs({
    args: argv,
    options: OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });

  const parts = ["puck"];
  let seenCommand = false;
  let command: CommandName | null = null;
  let index = 0;

  for (const token of tokens) {
    if (token.kind === "option-terminator") {
      parts.push("--");
    } else if (token.kind === "option") {
      if (!OPTION_NAMES.has(token.name)) {
        parts.push("--<unknown>");
        continue;
      }
      parts.push(`--${token.name}`);
      if (token.value !== undefined) {
        parts.push(
          CHOICES[token.name]?.includes(token.value) ? token.value : "<value>"
        );
      }
    } else if (!seenCommand) {
      seenCommand = true;
      if (COMMANDS.includes(token.value as CommandName)) {
        command = token.value as CommandName;
        parts.push(command);
      } else {
        parts.push(word(token.value) ?? "<arg>");
      }
    } else {
      const known = command ? ARGUMENTS[command] : undefined;
      parts.push(known?.(token.value, index) ? token.value : "<arg>");
      index++;
    }
  }

  if (parts.length > MAX_PARTS) parts.splice(MAX_PARTS, Infinity, "<more>");
  return parts.join(" ").slice(0, MAX_LENGTH);
};
