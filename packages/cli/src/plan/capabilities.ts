import type { CapabilityId } from "../result";
import type { Planner } from "./planner";
import { capabilityStatus } from "../detect/state";
import { adapterFor } from "../frameworks";
import { CLOUD_CLIENT_PACKAGE, PLUGIN_AI_PACKAGE } from "../constants";

export const CAPABILITY_IDS: CapabilityId[] = ["editor", "cloud", "ai"];

const DEPENDS_ON: Record<CapabilityId, CapabilityId[]> = {
  editor: [],
  cloud: ["editor"],
  // Puck Cloud is the backend; Puck AI is the editor plugin that uses it
  ai: ["cloud"],
};

/** Requested capabilities plus their dependencies, dependencies first */
export const resolveCapabilities = (
  requested: CapabilityId[]
): CapabilityId[] => {
  const ordered: CapabilityId[] = [];
  const visit = (id: CapabilityId) => {
    if (ordered.includes(id)) return;
    DEPENDS_ON[id].forEach(visit);
    ordered.push(id);
  };
  requested.forEach(visit);
  return ordered;
};

export const planCapabilities = (p: Planner, capabilities: CapabilityId[]) => {
  const framework = p.ctx.framework!;
  const adapter = adapterFor(framework);
  const status = capabilityStatus(p.state);
  const withAi = capabilities.includes("ai");
  // When the editor is created in this run, it's created with AI already
  let editorPlanned = false;

  for (const id of capabilities) {
    if (id === "editor") {
      if (status.editor.satisfied) continue;
      editorPlanned = true;
      adapter.planEditor(p, framework, withAi);
    }

    if (id === "cloud") {
      if (!p.state.cloud.clientInstalled) {
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
  }
};
