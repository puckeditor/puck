import path from "node:path";
import type { RunContext } from "../context";
import type { CommandResult, DoctorFinding } from "../result";
import { Vfs } from "../io/vfs";
import { emptyResult } from "../result";
import { detectProject } from "../detect/project";
import { capabilityStatus, detectState } from "../detect/state";
import { isIgnored } from "../env/gitignore";
import {
  aiSummary,
  authSummary,
  pagesSummary,
  cloudSummary,
  displayPath,
  projectSummary,
  puckSummary,
} from "../output/summary";
import { FRAMEWORK_LABELS } from "../detect/framework";
import { baseDir, resolveTarget } from "./target";
import {
  CANONICAL_INVOCATION,
  CLOUD_CLIENT_PACKAGE,
  ENV_KEY,
  MANUAL_INTEGRATION_DOCS_URL,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";
import { atLeast } from "../detect/package-json";

const finding = (
  check: string,
  status: DoctorFinding["status"],
  evidence: string,
  fix: string | null = null
): DoctorFinding => ({ check, status, evidence, fix });

export const runDoctor = async (rc: RunContext): Promise<CommandResult> => {
  const base = baseDir(rc);
  const result = emptyResult("doctor");
  const findings: DoctorFinding[] = [];
  const finish = () => {
    result.findings = findings;
    result.summary = { ok: 0, warn: 0, fail: 0, skip: 0 };
    for (const f of findings) result.summary[f.status]++;
    result.nextSteps = [
      ...new Set(
        findings.filter((f) => f.fix && f.status !== "ok").map((f) => f.fix!)
      ),
    ];
    result.message = result.summary.fail
      ? `${result.summary.fail} problem${
          result.summary.fail === 1 ? "" : "s"
        } found.`
      : result.summary.warn
      ? "No problems found, with warnings."
      : "No problems found.";
    return result;
  };

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  findings.push(
    nodeMajor >= 20
      ? finding("node.version", "ok", `Node.js ${process.versions.node}`)
      : finding(
          "node.version",
          "fail",
          `Node.js ${process.versions.node}`,
          "Install Node.js 20 or later"
        )
  );

  const target = await resolveTarget(rc, { prompt: false });
  if (target.kind === "action") {
    findings.push(
      finding(
        "workspace.target",
        "fail",
        `This workspace has several apps: ${
          target.action.type === "choose_workspace_package"
            ? target.action.choices.map((c) => c.value).join(", ")
            : ""
        }`,
        `${CANONICAL_INVOCATION} doctor --workspace <dir>`
      )
    );
    return finish();
  }
  if (target.kind === "workspace-empty") {
    findings.push(
      finding(
        "workspace.target",
        "fail",
        "No supported app in this workspace",
        `${CANONICAL_INVOCATION} init --name <name>`
      )
    );
    return finish();
  }

  const vfs = new Vfs();
  const ctx = detectProject({
    vfs,
    root: target.root,
    cwd: base,
    packageManagerFlag: rc.flags.packageManager,
    env: rc.deps.env,
  });
  const where =
    target.root === rc.deps.cwd
      ? ""
      : ` --cwd ${displayPath(rc.deps.cwd, target.root)}`;

  if (!ctx.hasPackageJson) {
    findings.push(
      finding(
        "project.package_json",
        "fail",
        `No package.json in ${ctx.root}`,
        `${CANONICAL_INVOCATION} init`
      )
    );
    return finish();
  }
  if (ctx.packageJsonError) {
    findings.push(
      finding(
        "project.package_json",
        "fail",
        ctx.packageJsonError,
        "Fix the syntax error in package.json"
      )
    );
    return finish();
  }
  findings.push(
    finding(
      "project.package_json",
      "ok",
      displayPath(base, path.join(ctx.root, "package.json"))
    )
  );

  result.project = projectSummary(ctx, target.workspace);
  if (!ctx.framework) {
    findings.push(
      finding(
        "project.framework",
        "fail",
        ctx.frameworkError?.message ?? "No supported framework found",
        `See ${MANUAL_INTEGRATION_DOCS_URL}`
      )
    );
    return finish();
  }
  findings.push(
    finding(
      "project.framework",
      "ok",
      `${FRAMEWORK_LABELS[ctx.framework.id]} ${
        ctx.framework.version ?? ""
      }`.trim()
    )
  );
  findings.push(
    ctx.typescript
      ? finding("project.typescript", "ok", "tsconfig.json found")
      : finding(
          "project.typescript",
          "fail",
          "No tsconfig.json",
          `See ${MANUAL_INTEGRATION_DOCS_URL}`
        )
  );
  findings.push(
    ctx.packageManager.warnings.length
      ? finding(
          "project.package_manager",
          "warn",
          ctx.packageManager.warnings.join("; "),
          "Remove the lockfiles you don't use"
        )
      : finding(
          "project.package_manager",
          "ok",
          `${ctx.packageManager.name} (from ${ctx.packageManager.source})`
        )
  );
  for (const warning of ctx.warnings.filter(
    (w) => !ctx.packageManager.warnings.includes(w)
  )) {
    findings.push(
      finding(
        "workspace.member",
        "warn",
        warning,
        "Add this directory to your workspace globs"
      )
    );
  }

  const state = detectState(vfs, ctx, rc.deps.env, {
    configFlag: rc.flags.config,
  });
  const status = capabilityStatus(state);
  const pm = ctx.packageManager.name;

  if (state.target === "server") {
    findings.push(
      state.pagesApi?.mounted
        ? finding("puck.pages_api", "ok", state.pagesApi.file)
        : finding(
            "puck.pages_api",
            "fail",
            state.pagesApi
              ? `${state.pagesApi.file} isn't mounted on the app`
              : "No Puck pages API found",
            `${CANONICAL_INVOCATION} add editor${where}`
          )
    );
  } else {
    findings.push(
      state.puck.installed
        ? finding(
            "puck.core_installed",
            "ok",
            `@puckeditor/core ${state.puck.declaredRange}`
          )
        : finding(
            "puck.core_installed",
            "fail",
            "@puckeditor/core is not a dependency",
            `${CANONICAL_INVOCATION} add editor${where}`
          )
    );
    if (state.puck.installed && !state.puck.resolvedVersion) {
      findings.push(
        finding(
          "puck.core_resolvable",
          "warn",
          "@puckeditor/core isn't installed in node_modules",
          `${pm} install`
        )
      );
    }
    if (state.puck.legacy) {
      findings.push(
        finding(
          "puck.legacy_package",
          "warn",
          "@measured/puck is installed. It was renamed to @puckeditor/core.",
          "https://puckeditor.com/docs/guides/migrations"
        )
      );
    }
    findings.push(
      state.puck.configFile
        ? finding("puck.config", "ok", state.puck.configFile)
        : finding(
            "puck.config",
            "warn",
            "No puck.config file found",
            `${CANONICAL_INVOCATION} add editor${where}`
          )
    );
    findings.push(
      state.scan.editorFiles.length
        ? finding("puck.editor", "ok", state.scan.editorFiles.join(", "))
        : finding(
            "puck.editor",
            "fail",
            "No <Puck> editor found",
            `${CANONICAL_INVOCATION} add editor${where}`
          )
    );
    if (state.scan.editorFiles.length && !state.scan.cssImported) {
      findings.push(
        finding(
          "puck.css_import",
          "warn",
          "@puckeditor/core/puck.css is never imported",
          'Import "@puckeditor/core/puck.css" in your editor page'
        )
      );
    }
  }

  findings.push(
    state.cloud.clientInstalled
      ? finding(
          "cloud.client_installed",
          "ok",
          `@puckeditor/cloud-client ${state.cloud.declaredRange}`
        )
      : finding(
          "cloud.client_installed",
          "fail",
          "@puckeditor/cloud-client is not a dependency",
          `${CANONICAL_INVOCATION} add cloud${where}`
        )
  );
  findings.push(
    state.cloud.routeFile
      ? finding("cloud.route", "ok", state.cloud.routeFile)
      : finding(
          "cloud.route",
          "fail",
          "No route uses puckHandler",
          `${CANONICAL_INVOCATION} add cloud${where}`
        )
  );
  if (state.cloud.routeRegistered !== "n/a") {
    findings.push(
      state.cloud.routeRegistered
        ? finding(
            "cloud.route_registered",
            "ok",
            state.target === "server"
              ? "The Puck Cloud route is mounted on the app"
              : 'route("api/puck/*") is registered'
          )
        : finding(
            "cloud.route_registered",
            "fail",
            state.target === "server"
              ? "The Puck Cloud route isn't mounted on the app"
              : "The Puck Cloud route isn't registered in routes.ts",
            `${CANONICAL_INVOCATION} add cloud${where}`
          )
    );
  }

  const key = state.cloud.apiKey;
  findings.push(
    key.present
      ? finding("cloud.api_key", "ok", `${ENV_KEY} set in ${key.source}`)
      : finding(
          "cloud.api_key",
          "fail",
          `${ENV_KEY} is not set`,
          `${CANONICAL_INVOCATION} add cloud${where}`
        )
  );
  if (key.file) {
    const ignored = isIgnored(
      vfs,
      key.file,
      ctx.gitRoot ?? ctx.workspace?.root ?? ctx.root
    );
    findings.push(
      ignored
        ? finding(
            "cloud.env_gitignored",
            "ok",
            `${key.source} is ignored by git`
          )
        : finding(
            "cloud.env_gitignored",
            "fail",
            `${key.source} contains ${ENV_KEY} but isn't ignored by git`,
            `echo "${key.source}" >> .gitignore`
          )
    );
  }

  // A server's AI plugin lives in the editor app
  if (
    state.target === "app" &&
    (state.cloud.clientInstalled || state.ai.installed)
  ) {
    findings.push(
      state.ai.installed
        ? finding(
            "ai.plugin_installed",
            "ok",
            `@puckeditor/plugin-ai ${state.ai.declaredRange}`
          )
        : finding(
            "ai.plugin_installed",
            "warn",
            "Puck Cloud is set up, but no editor plugin uses it",
            `${CANONICAL_INVOCATION} add ai${where}`
          )
    );
    if (state.ai.installed) {
      findings.push(
        state.scan.aiPluginFiles.length
          ? finding(
              "ai.plugin_configured",
              "ok",
              state.scan.aiPluginFiles.join(", ")
            )
          : finding(
              "ai.plugin_configured",
              "fail",
              "createAiPlugin isn't used in the editor",
              `${CANONICAL_INVOCATION} add ai${where}`
            )
      );
    }
  }

  // Puck Pages and Puck Auth, once they're in use
  const usesPages =
    state.pages.pluginInstalled || state.scan.cloudPageFiles.length > 0;
  const usesAuth =
    state.auth.pluginInstalled || state.scan.signInFiles.length > 0;
  const plugin = (
    capability: "pages" | "auth",
    pkg: string,
    factory: string,
    files: string[]
  ) => {
    if (state.target !== "app") return;
    findings.push(
      files.length
        ? finding(`${capability}.plugin_configured`, "ok", files.join(", "))
        : finding(
            `${capability}.plugin_configured`,
            "fail",
            `${factory} from ${pkg} isn't used in the editor`,
            `${CANONICAL_INVOCATION} add ${capability}${where}`
          )
    );
  };

  if (usesPages) {
    plugin(
      "pages",
      PLUGIN_PAGES_PACKAGE,
      "createPagesPlugin",
      state.scan.pagesPluginFiles
    );
    if (!state.cloud.external) {
      findings.push(
        state.scan.cloudPageFiles.length
          ? finding("pages.render", "ok", state.scan.cloudPageFiles.join(", "))
          : finding(
              "pages.render",
              "warn",
              "Nothing reads published pages from Puck Cloud with getPage",
              `${CANONICAL_INVOCATION} add pages${where}`
            )
      );
    }
  }

  if (usesAuth) {
    plugin(
      "auth",
      PLUGIN_AUTH_PACKAGE,
      "createAuthPlugin",
      state.scan.authPluginFiles
    );
    if (!state.cloud.external) {
      findings.push(
        state.auth.routeAuthenticated
          ? finding(
              "auth.route",
              "ok",
              `${state.cloud.routeFile} requires Sign in with Puck`
            )
          : finding(
              "auth.route",
              "fail",
              "The Puck Cloud API route doesn't use Sign in with Puck",
              `${CANONICAL_INVOCATION} add auth${where}`
            )
      );
    }
  }

  // Pages and Sign in with Puck arrived in a newer cloud-client
  if ((usesPages || usesAuth) && state.cloud.clientInstalled) {
    const min = rc.deps.templates.manifest().cloudClientPagesRange;
    findings.push(
      atLeast(state.cloud.declaredRange, min)
        ? finding(
            "cloud.client_version",
            "ok",
            `${CLOUD_CLIENT_PACKAGE} ${state.cloud.declaredRange}`
          )
        : finding(
            "cloud.client_version",
            "fail",
            `${CLOUD_CLIENT_PACKAGE} ${state.cloud.declaredRange} doesn't have Puck Pages or Sign in with Puck`,
            `npm install ${CLOUD_CLIENT_PACKAGE}@${min}`
          )
    );
  }

  let verified: "remote" | "local" | "failed" | "none" = status.cloud.satisfied
    ? "local"
    : "none";
  if (!key.present || !key.value) {
    findings.push(finding("cloud.connection", "skip", "No API key to check"));
  } else if (rc.flags.offline) {
    findings.push(finding("cloud.connection", "skip", "Skipped (--offline)"));
  } else {
    rc.secrets.add(key.value);
    const check = await rc.cloud.verifyKey(key.value);
    if (check === "valid") {
      verified = "remote";
      findings.push(
        finding(
          "cloud.connection",
          "ok",
          `Puck Cloud accepted the API key (${rc.cloud.baseUrl})`
        )
      );
    } else if (check === "invalid") {
      verified = "failed";
      findings.push(
        finding(
          "cloud.connection",
          "fail",
          "Puck Cloud rejected the API key",
          `${CANONICAL_INVOCATION} connect${where}`
        )
      );
    } else {
      findings.push(
        finding(
          "cloud.connection",
          "warn",
          `Couldn't reach ${rc.cloud.baseUrl}`,
          `${CANONICAL_INVOCATION} doctor --offline`
        )
      );
    }
  }

  result.puck = puckSummary(state);
  result.cloud = cloudSummary(state, verified);
  result.ai = aiSummary(state);
  result.pages = pagesSummary(state);
  result.auth = authSummary(state);
  return finish();
};
