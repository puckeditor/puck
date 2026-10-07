import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import type { PuckPlugin } from "../ast/puck-plugins";
import { ensurePuckPlugin } from "../ast/puck-plugins";
import { RouteAuth, withRouteAuth } from "../templates/auth";
import { PLUGIN_AUTH_PACKAGE } from "../constants";

export const AUTH_PLUGIN: PuckPlugin = {
  factory: "createAuthPlugin",
  source: PLUGIN_AUTH_PACKAGE,
  local: "authPlugin",
  css: `${PLUGIN_AUTH_PACKAGE}/styles.css`,
};

/** An editor with the Puck Auth plugin added, for upgradeVariant sources */
export const withAuthPlugin = (code: string, file: string) => {
  const result = ensurePuckPlugin(code, file, AUTH_PLUGIN);
  return result.status === "inserted" ? result.code : code;
};

/**
 * Sets `authenticate` on the Cloud route, including one created earlier in
 * this plan. Pages needs it ("unowned"), and Auth makes it Sign in with Puck.
 */
export const planRouteAuth = (
  p: Planner,
  auth: RouteAuth,
  capability: CapabilityId
) => {
  const file = p.state.cloud.routeFile ?? p.state.cloud.expectedRouteFile;
  const current = file && p.vfs.readText(p.abs(file));
  if (!file || current === null) return;

  const next = withRouteAuth(current, file, auth, p.cloudHost);
  if (next === current) return;
  if (next !== null) {
    p.modifyFile(file, next, {
      capability,
      summary:
        auth === "puckAuth"
          ? `Require Sign in with Puck in ${file}`
          : `Set authenticate in ${file}`,
    });
    return;
  }

  p.manual({
    id: `${capability}:route-auth`,
    type: "manual_edit",
    capability,
    required: true,
    file,
    reason: "unsupported_shape",
    message: `${file} was customised, so authenticate wasn't set automatically.`,
    instructions:
      auth === "puckAuth"
        ? `Pass Sign in with Puck to puckHandler in ${file}.`
        : `Pass an authenticate option to puckHandler in ${file}, which the version of @puckeditor/cloud-client with Puck Pages requires. () => ({ id: null }) lets anyone who can reach the route use your API key.`,
    snippet:
      auth === "puckAuth"
        ? `import { puckAuth } from "@puckeditor/cloud-client/auth";\n\npuckHandler(request, { authenticate: puckAuth });\n`
        : `puckHandler(request, { authenticate: () => ({ id: null }) });\n`,
  });
};

/** Local pages the editor no longer reads or writes */
export const warnLocalPages = (p: Planner) => {
  if (!p.vfs.exists(p.abs("database.json"))) return;
  p.warn(
    "PUCK-CLI-W-LOCAL-PAGES",
    "Pages are now stored in Puck Cloud, so database.json and the routes that read and write it are no longer used. Import its pages with `npx @puckeditor/cli pages import database.json`, then delete them."
  );
};
