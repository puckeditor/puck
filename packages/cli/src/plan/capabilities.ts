import type { CapabilityId } from "../result";
import type { Planner } from "./planner";
import { capabilityStatus } from "../detect/state";
import { adapterFor } from "../frameworks";
import {
  CANONICAL_INVOCATION,
  CLOUD_CLIENT_PACKAGE,
  DOCS_URL,
  PLUGIN_AI_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";
import { versionOf } from "../detect/package-json";

/**
 * In the order they're planned. Puck AI comes before Pages and Auth, which
 * rewrite the editor knowing whether it has AI.
 */
export const CAPABILITY_IDS: CapabilityId[] = [
  "editor",
  "cloud",
  "ai",
  "pages",
  "auth",
];

const DEPENDS_ON: Record<CapabilityId, CapabilityId[]> = {
  editor: [],
  cloud: ["editor"],
  // Puck Cloud is the backend; Puck AI is the editor plugin that uses it
  ai: ["cloud"],
  // Pages are stored in Puck Cloud, and Sign in with Puck is served by it
  pages: ["cloud"],
  auth: ["cloud"],
};

/** Warnings Puck Auth takes care of */
const AUTH_RESOLVES = ["PUCK-CLI-W-PUBLIC-ROUTE", "PUCK-CLI-W-EDITOR-PUBLIC"];

/** Requested capabilities plus their dependencies, in planning order */
export const resolveCapabilities = (
  requested: CapabilityId[]
): CapabilityId[] => {
  const resolved = new Set<CapabilityId>();
  const visit = (id: CapabilityId) => {
    if (resolved.has(id)) return;
    resolved.add(id);
    DEPENDS_ON[id].forEach(visit);
  };
  requested.forEach(visit);
  return CAPABILITY_IDS.filter((id) => resolved.has(id));
};

/** Pages and Sign in with Puck need a newer cloud-client than Puck AI */
const planCloudClientUpgrade = (p: Planner, capability: CapabilityId) => {
  const range = p.templates.manifest().cloudClientPagesRange;
  const [major, minor] = versionOf(p.state.cloud.declaredRange) ?? [0, 0];
  const [minMajor, minMinor] = versionOf(range)!;
  if (major > minMajor || (major === minMajor && minor >= minMinor)) return;
  p.addDependency(CLOUD_CLIENT_PACKAGE, range, capability);
};

export const planCapabilities = (p: Planner, capabilities: CapabilityId[]) => {
  const framework = p.ctx.framework!;
  const adapter = adapterFor(framework);
  const status = capabilityStatus(p.state);
  const withAi = capabilities.includes("ai");
  const withAuth = capabilities.includes("auth") || status.auth.satisfied;
  // When the editor is created in this run, it's created with AI already
  let editorPlanned = false;

  for (const id of capabilities) {
    if (id === "editor") {
      if (status.editor.satisfied) continue;
      editorPlanned = true;
      adapter.planEditor(p, framework, withAi);
    }

    if (id === "cloud") {
      if (p.backend?.mode === "external") {
        p.warn(
          "PUCK-CLI-W-EXTERNAL-BACKEND",
          `Puck Cloud runs on ${
            p.backend.url ?? "the server /api is proxied to"
          }. Run \`npx @puckeditor/cli init --ai\` in that server's project to set it up.`
        );
        continue;
      }
      // Pages and Auth install a newer cloud-client
      const pagesOrAuth =
        capabilities.includes("pages") || capabilities.includes("auth");
      if (!p.state.cloud.clientInstalled && !pagesOrAuth) {
        p.addDependency(
          CLOUD_CLIENT_PACKAGE,
          p.templates.manifest().cloudClientRange,
          "cloud"
        );
      }
      adapter.planCloudRoute(p, framework, withAi);

      p.warn("PUCK-CLI-W-DEPLOY-ENV", adapter.deployEnvWarning);
      p.warn(
        "PUCK-CLI-W-PUBLIC-ROUTE",
        "The /api/puck route forwards requests to Puck Cloud using your API key. Add authentication before deploying."
      );
    }

    if (id === "ai") {
      if (adapter.kind === "server") continue;
      if (!p.state.ai.installed) {
        p.addDependency(
          PLUGIN_AI_PACKAGE,
          p.templates.manifest().pluginAiRange,
          "ai"
        );
      }
      if (editorPlanned || p.state.scan.aiPluginFiles.length > 0) continue;
      adapter.planAi(p, framework);
    }

    if (id === "pages") {
      if (status.pages.satisfied) continue;
      planCloudClientUpgrade(p, "pages");
      if (adapter.kind !== "server" && !p.state.pages.pluginInstalled) {
        p.addDependency(
          PLUGIN_PAGES_PACKAGE,
          p.templates.manifest().pluginPagesRange,
          "pages"
        );
      }
      if (adapter.planPages) adapter.planPages(p, framework);
      else unsupported(p, "pages");

      if (!withAuth) {
        p.warn(
          "PUCK-CLI-W-PAGES-UNAUTHENTICATED",
          `Anyone who can reach /api/puck can edit, publish and delete pages using your API key. Add Sign in with Puck with \`${CANONICAL_INVOCATION} add auth\` before deploying.`
        );
      }
    }

    if (id === "auth") {
      if (status.auth.satisfied) continue;
      planCloudClientUpgrade(p, "auth");
      if (adapter.kind !== "server" && !p.state.auth.pluginInstalled) {
        p.addDependency(
          PLUGIN_AUTH_PACKAGE,
          p.templates.manifest().pluginAuthRange,
          "auth"
        );
      }
      if (adapter.planAuth) adapter.planAuth(p, framework);
      else unsupported(p, "auth");

      if (!capabilities.includes("pages") && !status.pages.satisfied) {
        p.warn(
          "PUCK-CLI-W-LOCAL-SAVE-PUBLIC",
          `Sign in with Puck protects the editor and Puck Cloud, but the editor still saves pages through your own route, which anyone can call. Store pages in Puck Cloud with \`${CANONICAL_INVOCATION} add pages\`, or protect that route.`
        );
      }
    }
  }

  if (withAuth)
    p.warnings = p.warnings.filter((w) => !AUTH_RESOLVES.includes(w.code));
};

const unsupported = (p: Planner, capability: "pages" | "auth") =>
  p.manual({
    id: `${capability}:unsupported`,
    type: "manual_edit",
    capability,
    required: true,
    file: p.state.scan.editorFiles[0] ?? "puck.config.tsx",
    reason: "unsupported_shape",
    message: `The CLI can't set up Puck ${
      capability === "pages" ? "Pages" : "Auth"
    } in this framework yet.`,
    instructions: `Follow ${DOCS_URL} to set it up by hand.`,
  });
