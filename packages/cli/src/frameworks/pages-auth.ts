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

export const AUTH_PLUGIN_SNIPPET = `import { createAuthPlugin } from "@puckeditor/plugin-auth";
import "@puckeditor/plugin-auth/styles.css";

const authPlugin = createAuthPlugin();

<Puck plugins={[authPlugin]} config={config} data={data} />
`;

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
        auth === "signIn"
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
      auth === "signIn"
        ? `Pass Sign in with Puck to puckHandler in ${file}.`
        : `Pass an authenticate option to puckHandler in ${file}, which the version of @puckeditor/cloud-client with Puck Pages requires. () => ({ id: null }) lets anyone who can reach the route use your API key.`,
    snippet:
      auth === "signIn"
        ? `import { authenticate } from "@puckeditor/cloud-client/auth";\n\npuckHandler(request, { authenticate });\n`
        : `puckHandler(request, { authenticate: () => ({ id: null }) });\n`,
  });
};

/** Adds the Puck Auth plugin to the editor, preferring `preferred` */
export const planAuthPlugin = (p: Planner, preferred: string) => {
  const editors = p.state.scan.editorFiles;
  const file = p.vfs.exists(p.abs(preferred))
    ? preferred
    : editors.length === 1
    ? editors[0]
    : null;
  const current = file && p.vfs.readText(p.abs(file));
  const result = current
    ? ensurePuckPlugin(current, file!, AUTH_PLUGIN)
    : ({
        status: "manual",
        detail: "No single Puck editor was found",
      } as const);

  if (result.status === "exists") return;
  if (result.status === "inserted") {
    p.modifyFile(file!, result.code, {
      capability: "auth",
      summary: `Add the Puck Auth plugin to ${file}`,
      inserted: result.inserted,
    });
    return;
  }

  p.manual({
    id: "auth:editor",
    type: "manual_edit",
    capability: "auth",
    required: true,
    file: file ?? preferred,
    reason: "unsupported_shape",
    message: `Couldn't add the Puck Auth plugin automatically: ${result.detail}.`,
    instructions:
      "Add the Puck Auth plugin to your <Puck> editor's plugins, and import its styles.",
    snippet: AUTH_PLUGIN_SNIPPET,
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
