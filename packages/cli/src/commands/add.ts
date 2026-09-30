import type { RunContext } from "../context";
import type { CapabilityId, CommandResult } from "../result";
import { CliError } from "../errors";
import { CANONICAL_INVOCATION } from "../constants";
import { emptyResult } from "../result";
import { CAPABILITY_IDS } from "../plan/capabilities";
import { resolveTarget } from "./target";
import { runMutation } from "./mutate";

export const runAdd = async (
  rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  if (positionals.length === 0) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `Specify what to add: ${CAPABILITY_IDS.join(
        ", "
      )}. For example \`${CANONICAL_INVOCATION} add cloud\`.`
    );
  }

  const unknown = positionals.filter(
    (p) => !CAPABILITY_IDS.includes(p as CapabilityId)
  );
  if (unknown.length > 0) {
    throw new CliError(
      "PUCK-CLI-UNKNOWN-CAPABILITY",
      `Unknown capability: ${unknown.join(
        ", "
      )}. Available: ${CAPABILITY_IDS.join(", ")}.`
    );
  }

  const target = await resolveTarget(rc);

  if (target.kind === "action") {
    const result = emptyResult("add", rc.flags.dryRun);
    result.status = "action_required";
    result.message = target.action.message;
    result.actions = [target.action];
    return result;
  }

  if (target.kind === "workspace-empty") {
    throw new CliError(
      "PUCK-CLI-UNSUPPORTED-FRAMEWORK",
      "No supported app was found in this workspace. Run `npx @puckeditor/cli init` to create one.",
      { fix: "npx @puckeditor/cli init --name <name>" }
    );
  }

  return runMutation(rc, {
    command: "add",
    requested: [...new Set(positionals)] as CapabilityId[],
    root: target.root,
    notes: target.note ? [target.note] : [],
    workspace: target.workspace,
  });
};
