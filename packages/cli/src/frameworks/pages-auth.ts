import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import type { PuckPlugin } from "../ast/puck-plugins";
import { ensurePuckPlugin } from "../ast/puck-plugins";
import { RouteAuth, withRouteAuth } from "../templates/auth";
import { PLUGIN_ASSETS_PACKAGE, PLUGIN_AUTH_PACKAGE } from "../constants";

export const ASSETS_PLUGIN: PuckPlugin = {
  factory: "createAssetsPlugin",
  source: PLUGIN_ASSETS_PACKAGE,
  local: "assetsPlugin",
  css: `${PLUGIN_ASSETS_PACKAGE}/styles.css`,
};

// Before Assets, so the editor is the same whichever is added first
export const AUTH_PLUGIN: PuckPlugin = {
  factory: "createAuthPlugin",
  source: PLUGIN_AUTH_PACKAGE,
  local: "authPlugin",
  css: `${PLUGIN_AUTH_PACKAGE}/styles.css`,
  before: [ASSETS_PLUGIN],
};

/** An editor with the Puck Auth plugin added, for upgradeVariant sources */
export const withAuthPlugin = (code: string, file: string) => {
  const result = ensurePuckPlugin(code, file, AUTH_PLUGIN);
  return result.status === "inserted" ? result.code : code;
};

/** An editor with the Puck Assets plugin added, for upgradeVariant sources */
export const withAssetsPlugin = (code: string, file: string) => {
  const result = ensurePuckPlugin(code, file, ASSETS_PLUGIN);
  return result.status === "inserted" ? result.code : code;
};

const pluginSnippet = (
  plugin: PuckPlugin
) => `import { ${plugin.factory} } from "${plugin.source}";
import "${plugin.css}";

const ${plugin.local} = ${plugin.factory}();

<Puck plugins={[${plugin.local}]} config={config} data={data} />
`;

export const AUTH_PLUGIN_SNIPPET = pluginSnippet(AUTH_PLUGIN);
export const ASSETS_PLUGIN_SNIPPET = pluginSnippet(ASSETS_PLUGIN);

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

interface EditorPlugin {
  plugin: PuckPlugin;
  capability: CapabilityId;
  /** e.g. "Puck Auth" */
  name: string;
  snippet: string;
}

const AUTH_EDITOR: EditorPlugin = {
  plugin: AUTH_PLUGIN,
  capability: "auth",
  name: "Puck Auth",
  snippet: AUTH_PLUGIN_SNIPPET,
};

const ASSETS_EDITOR: EditorPlugin = {
  plugin: ASSETS_PLUGIN,
  capability: "assets",
  name: "Puck Assets",
  snippet: ASSETS_PLUGIN_SNIPPET,
};

/** Adds a plugin to the editor, preferring `preferred` */
const planEditorPlugin = (
  p: Planner,
  preferred: string,
  { plugin, capability, name, snippet }: EditorPlugin
) => {
  const editors = p.state.scan.editorFiles;
  const file = p.vfs.exists(p.abs(preferred))
    ? preferred
    : editors.length === 1
    ? editors[0]
    : null;
  const current = file && p.vfs.readText(p.abs(file));
  const result = current
    ? ensurePuckPlugin(current, file!, plugin)
    : ({
        status: "manual",
        detail: "No single Puck editor was found",
      } as const);

  if (result.status === "exists") return;
  if (result.status === "inserted") {
    p.modifyFile(file!, result.code, {
      capability,
      summary: `Add the ${name} plugin to ${file}`,
      inserted: result.inserted,
    });
    return;
  }

  p.manual({
    id: `${capability}:editor`,
    type: "manual_edit",
    capability,
    required: true,
    file: file ?? preferred,
    reason: "unsupported_shape",
    message: `Couldn't add the ${name} plugin automatically: ${result.detail}.`,
    instructions: `Add the ${name} plugin to your <Puck> editor's plugins, and import its styles.`,
    snippet,
  });
};

/** Adds the Puck Auth plugin to the editor, preferring `preferred` */
export const planAuthPlugin = (p: Planner, preferred: string) =>
  planEditorPlugin(p, preferred, AUTH_EDITOR);

/** Adds the Puck Assets plugin to the editor, preferring `preferred` */
export const planAssetsPlugin = (p: Planner, preferred: string) =>
  planEditorPlugin(p, preferred, ASSETS_EDITOR);

/** Local pages the editor no longer reads or writes */
export const warnLocalPages = (p: Planner) => {
  if (!p.vfs.exists(p.abs("database.json"))) return;
  p.warn(
    "PUCK-CLI-W-LOCAL-PAGES",
    "Pages are now stored in Puck Cloud, so database.json and the routes that read and write it are no longer used. Import its pages with `npx @puckeditor/cli pages import database.json`, then delete them."
  );
};
