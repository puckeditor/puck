import type { CliDeps } from "./deps";
import type { CommandResult } from "./result";
import { CliError, EXIT_CODES, exitCodeForError } from "./errors";
import { parseCliArgs, wantsJson } from "./args";
import { createRunContext } from "./context";
import { emptyResult } from "./result";
import { HELP_TEXT, helpResult } from "./help";
import { presentHuman, presentJson } from "./output/present";
import { SecretRegistry } from "./secret";
import { runInit } from "./commands/init";
import { runAdd } from "./commands/add";
import { runStatus } from "./commands/status";
import { runDoctor } from "./commands/doctor";
import { runDocs } from "./commands/docs";

const exitCodeFor = (result: CommandResult) => {
  if (result.status === "error")
    return result.error
      ? exitCodeForError(result.error.code)
      : EXIT_CODES.internal;
  if (result.status === "action_required") return EXIT_CODES.actionRequired;
  if (result.status === "partial") return EXIT_CODES.partial;
  if (result.command === "doctor" && (result.summary?.fail ?? 0) > 0)
    return EXIT_CODES.doctorFailed;
  return EXIT_CODES.success;
};

const errorResult = (
  command: CommandResult["command"],
  err: unknown,
  dryRun = false
): CommandResult => {
  const result = emptyResult(command, dryRun);
  result.status = "error";
  const cliError =
    err instanceof CliError
      ? err
      : new CliError(
          "PUCK-CLI-INTERNAL",
          `Unexpected error: ${(err as Error)?.message ?? String(err)}`,
          {
            stack: (err as Error)?.stack?.split("\n").slice(0, 6).join("\n"),
          }
        );
  result.error = cliError.toPayload();
  result.message = cliError.message;
  return result;
};

export const runCli = async (
  argv: string[],
  deps: CliDeps
): Promise<number> => {
  let parsed;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    const result = errorResult("help", err);
    if (wantsJson(argv)) presentJson(deps.stdout, result, new SecretRegistry());
    else presentHuman(deps.stderr, result, new SecretRegistry());
    return exitCodeFor(result);
  }

  const { command, flags, positionals } = parsed;

  if (flags.version) {
    deps.stdout.write(
      flags.json
        ? JSON.stringify({ version: deps.cliVersion }) + "\n"
        : `${deps.cliVersion}\n`
    );
    return EXIT_CODES.success;
  }

  if (!command || command === "help" || flags.help) {
    if (flags.json)
      presentJson(deps.stdout, helpResult(), new SecretRegistry());
    else deps.stdout.write(HELP_TEXT);
    return EXIT_CODES.success;
  }

  const rc = createRunContext(deps, flags, argv);
  let result: CommandResult;

  try {
    if (command === "init") result = await runInit(rc);
    else if (command === "add") result = await runAdd(rc, positionals);
    else if (command === "status") result = await runStatus(rc);
    else if (command === "docs") result = await runDocs(rc, positionals);
    else result = await runDoctor(rc);
  } catch (err) {
    result = errorResult(command, err, flags.dryRun);
  }

  if (flags.json) presentJson(deps.stdout, result, rc.secrets);
  else
    presentHuman(
      result.status === "error" ? deps.stderr : deps.stdout,
      result,
      rc.secrets
    );

  if (result.status === "success" && rc.afterOutput) await rc.afterOutput();

  return exitCodeFor(result);
};
