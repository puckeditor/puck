import type { RunContext } from "../context";
import type { CommandResult, FrameworkSupport } from "../result";
import type { FrameworkId } from "../detect/framework";
import { emptyResult } from "../result";
import { CliError } from "../errors";
import { CANONICAL_INVOCATION } from "../constants";
import {
  FRAMEWORK_IDS,
  FRAMEWORK_LABELS,
  MIN_VERSIONS,
} from "../detect/framework";
import { ADAPTERS } from "../frameworks";

const NOTES: Record<FrameworkId, string> = {
  next: "App Router, in app/ or src/app/",
  "react-router": "Framework mode",
  "tanstack-start": "",
  vinext: "App Router, in app/ or src/app/",
  vite: "React apps using @vitejs/plugin-react",
  astro: "Adds React with astro add react if needed",
  hono: "Serves the APIs for an editor in another app",
  express: "Serves the APIs for an editor in another app",
};

/** What the CLI supports for each framework, from the adapters and detection */
export const frameworkSupport = (): FrameworkSupport[] =>
  FRAMEWORK_IDS.map((id) => {
    const adapter = ADAPTERS[id];
    return {
      id,
      name: FRAMEWORK_LABELS[id],
      minVersion: MIN_VERSIONS[id],
      kind: adapter.kind ?? "app",
      needsServer: Boolean(adapter.backend),
      notes: NOTES[id],
    };
  });

export const runFrameworks = async (
  _rc: RunContext,
  positionals: string[]
): Promise<CommandResult> => {
  if (positionals.length > 0) {
    throw new CliError(
      "PUCK-CLI-INVALID-ARGS",
      `\`frameworks\` doesn't take arguments. Run \`${CANONICAL_INVOCATION} frameworks\`.`
    );
  }

  const result = emptyResult("frameworks");
  result.frameworks = frameworkSupport();
  result.message = `Create a new app with \`${CANONICAL_INVOCATION} init --framework <id>\`.`;
  return result;
};
