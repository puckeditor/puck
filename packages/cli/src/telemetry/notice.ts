import type { CliDeps } from "../deps";
import type { Telemetry } from "./consent";
import { CANONICAL_INVOCATION, DOCS_URL } from "../constants";

export const TELEMETRY_NOTICE = `Puck CLI collects anonymous usage data, like which commands run and whether they succeed. It never includes code, file paths, project names or API keys.
To opt out, run \`${CANONICAL_INVOCATION} telemetry disable\` or set PUCK_TELEMETRY_DISABLED=1.
Learn more: ${DOCS_URL}#telemetry
`;

/** Shows the notice once per machine, to humans only */
export const showTelemetryNotice = (deps: CliDeps, telemetry: Telemetry) => {
  if (!telemetry.enabled || telemetry.config.notifiedAt) return;
  deps.stderr.write(`${TELEMETRY_NOTICE}\n`);
  telemetry.config.notifiedAt = new Date(deps.now()).toISOString();
  try {
    telemetry.store.save(telemetry.config);
  } catch {
    // Shown again next time
  }
};
