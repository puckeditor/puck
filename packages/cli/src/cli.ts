import type { CliDeps } from "./deps";
import type { CommandResult } from "./result";
import { CliError, EXIT_CODES, exitCodeForError } from "./errors";
import { parseCliArgs, wantsJson } from "./args";
import { cloudBaseUrl, createRunContext } from "./context";
import { emptyResult } from "./result";
import { HELP_TEXT, helpResult } from "./help";
import { presentHuman, presentJson } from "./output/present";
import { SecretRegistry } from "./secret";
import { runInit } from "./commands/init";
import { runAdd } from "./commands/add";
import { runConnect } from "./commands/connect";
import { runStatus } from "./commands/status";
import { runDoctor } from "./commands/doctor";
import { runDocs } from "./commands/docs";
import { runFrameworks } from "./commands/frameworks";
import type { Telemetry } from "./telemetry/consent";
import { loadTelemetry } from "./telemetry/consent";
import type { EventInput } from "./telemetry/event";
import { buildEvent } from "./telemetry/event";
import { sendTelemetry } from "./telemetry/client";
import { showTelemetryNotice } from "./telemetry/notice";

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

const recordRun = (
  deps: CliDeps,
  telemetry: Telemetry,
  startedAt: number,
  input: Omit<
    EventInput,
    | "durationMs"
    | "env"
    | "cliVersion"
    | "platform"
    | "arch"
    | "nodeVersion"
    | "now"
  >
) => {
  const now = deps.now();
  const event = buildEvent({
    ...input,
    durationMs: now - startedAt,
    env: deps.env,
    cliVersion: deps.cliVersion,
    platform: deps.platform,
    arch: deps.arch,
    nodeVersion: deps.nodeVersion,
    now,
  });
  return sendTelemetry(deps, cloudBaseUrl(deps.env), telemetry, [event]);
};

export const runCli = async (
  argv: string[],
  deps: CliDeps
): Promise<number> => {
  const startedAt = deps.now();
  let parsed;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    const result = errorResult("help", err);
    const json = wantsJson(argv);
    if (json) presentJson(deps.stdout, result, new SecretRegistry());
    else presentHuman(deps.stderr, result, new SecretRegistry());
    const exitCode = exitCodeFor(result);
    await recordRun(
      deps,
      loadTelemetry(deps, cloudBaseUrl(deps.env)),
      startedAt,
      {
        command: null,
        positionals: [],
        flags: { json },
        result,
        exitCode,
        interactive: false,
      }
    );
    return exitCode;
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

  const telemetry = loadTelemetry(deps, cloudBaseUrl(deps.env));
  const rc = createRunContext(deps, flags, argv, telemetry);
  // Agents asking for --json get clean output; the next human run shows it
  if (!flags.json) showTelemetryNotice(deps, telemetry);
  let result: CommandResult;

  try {
    if (command === "init") result = await runInit(rc);
    else if (command === "add") result = await runAdd(rc, positionals);
    else if (command === "connect") result = await runConnect(rc);
    else if (command === "status") result = await runStatus(rc);
    else if (command === "docs") result = await runDocs(rc, positionals);
    else if (command === "frameworks")
      result = await runFrameworks(rc, positionals);
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

  const exitCode = exitCodeFor(result);
  // Before afterOutput, which can start a dev server that runs until exit
  await recordRun(deps, telemetry, startedAt, {
    command,
    positionals,
    flags,
    result,
    exitCode,
    interactive: rc.interactive,
  });

  if (result.status === "success" && rc.afterOutput) await rc.afterOutput();

  return exitCode;
};
