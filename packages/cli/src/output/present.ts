import pc from "picocolors";
import type { CommandResult, RequiredAction } from "../result";
import type { OutputStream } from "../deps";
import type { SecretRegistry } from "../secret";
import { FRAMEWORK_LABELS } from "../detect/framework";
import { ADAPTERS } from "../frameworks";
import { capabilityLabels } from "./summary";

export const presentJson = (
  out: OutputStream,
  result: CommandResult,
  secrets: SecretRegistry
) => {
  out.write(secrets.scrub(JSON.stringify(result, null, 2)) + "\n");
};

const indent = (text: string, prefix = "    ") =>
  text
    .trimEnd()
    .split("\n")
    .map((l) => prefix + l)
    .join("\n");

const actionLines = (action: RequiredAction): string[] => {
  const lines = [
    `${action.required ? pc.yellow("→") : pc.dim("→")} ${action.message}`,
  ];
  switch (action.type) {
    case "browser_login":
      lines.push(
        `    Open ${pc.cyan(action.url)}`,
        `    and confirm the code ${pc.bold(action.userCode)}`
      );
      break;
    case "provide_api_key":
      lines.push(`    ${action.instructions}`);
      break;
    case "choose_framework":
      lines.push(
        `    ${action.flag} ${action.choices.map((c) => c.value).join(" | ")}`
      );
      break;
    case "choose_workspace_package":
      lines.push(
        ...action.choices.map(
          (c) => `    ${action.flag} ${c.value}  ${pc.dim(c.label)}`
        )
      );
      break;
    case "provide_app_name":
      lines.push(`    ${action.flag} ${action.suggested}`);
      break;
    case "choose_ai":
      lines.push(
        ...action.choices.map(
          (c) => `    ${c.value.padEnd(8)} ${pc.dim(c.label)}`
        )
      );
      break;
    case "choose_backend":
      lines.push(
        ...action.choices.map(
          (c) =>
            `    ${`${action.flag} ${c.value}`.padEnd(20)} ${pc.dim(c.label)}`
        )
      );
      break;
    case "manual_edit":
      lines.push(`    ${action.instructions}`);
      if (action.snippet) lines.push(pc.dim(indent(action.snippet, "      ")));
      break;
    case "set_environment_variable":
    case "run_command":
      lines.push(
        `    ${"instructions" in action ? action.instructions : action.command}`
      );
      break;
  }
  if (action.rerun) lines.push(`    Then run: ${pc.cyan(action.rerun)}`);
  return lines;
};

const statusTable = (result: CommandResult) => {
  const rows: [string, string][] = [];
  const p = result.project;
  if (p) {
    if (p.workspace)
      rows.push(["Workspace", `${p.workspace.root} (${p.workspace.manager})`]);
    // At a workspace root there's no single app to describe
    if (p.workspace && !result.puck) return rows.map(([k, v]) => `${k}  ${v}`);
    rows.push([
      "Framework",
      p.framework
        ? `${FRAMEWORK_LABELS[p.framework]} ${p.frameworkVersion ?? ""}`.trim()
        : "not detected",
    ]);
    rows.push(["Package manager", p.packageManager]);
  }
  if (result.puck) {
    const server =
      result.project?.framework &&
      ADAPTERS[result.project.framework].kind === "server";
    rows.push([
      capabilityLabels(Boolean(server)).editor,
      result.puck.configured
        ? pc.green("configured")
        : result.puck.installed
        ? pc.yellow("installed, not integrated")
        : pc.dim("not installed"),
    ]);
  }
  if (result.cloud) {
    const c = result.cloud;
    const label = c.configured
      ? pc.green(c.verified === "remote" ? "connected" : "configured")
      : c.verified === "failed"
      ? pc.red("API key rejected")
      : pc.dim("not connected");
    rows.push(["Puck Cloud", label]);
    if (c.apiKey.present) rows.push(["API key", `set in ${c.apiKey.source}`]);
  }
  if (result.ai) {
    rows.push([
      "Puck AI",
      result.ai.configured
        ? pc.green("configured")
        : result.ai.installed
        ? pc.yellow("installed, not added to the editor")
        : pc.dim("not installed"),
    ]);
  }
  const width = Math.max(...rows.map(([k]) => k.length), 0) + 2;
  return rows.map(([k, v]) => `${k.padEnd(width)}${v}`);
};

export const presentHuman = (
  out: OutputStream,
  result: CommandResult,
  secrets: SecretRegistry
) => {
  const lines: string[] = [];
  const write = () => out.write(secrets.scrub(lines.join("\n")) + "\n");

  if (result.command === "status") {
    lines.push(pc.bold("Puck project"), "", ...statusTable(result), "");
    if (result.project?.workspace && !result.puck) {
      const { packages } = result.project.workspace;
      const width = Math.max(...packages.map((pkg) => pkg.dir.length)) + 1;
      for (const pkg of packages) {
        const fw = pkg.framework
          ? FRAMEWORK_LABELS[pkg.framework]
          : pc.dim("unsupported");
        lines.push(
          `  ${pkg.dir.padEnd(width)} ${fw}${
            pkg.cloud ? pc.green("  Puck Cloud") : pkg.puck ? "  Puck" : ""
          }`
        );
      }
      lines.push("");
    }
    lines.push(result.message);
  } else if (result.command === "doctor") {
    lines.push(pc.bold("Puck Doctor"), "");
    for (const f of result.findings ?? []) {
      const icon = {
        ok: pc.green("✓"),
        warn: pc.yellow("!"),
        fail: pc.red("✗"),
        skip: pc.dim("-"),
      }[f.status];
      lines.push(
        `${icon} ${f.check.padEnd(24)} ${
          f.status === "ok" ? pc.dim(f.evidence) : f.evidence
        }`
      );
      if (f.fix && f.status !== "ok" && f.status !== "skip")
        lines.push(`  ${" ".repeat(24)} ${pc.cyan(f.fix)}`);
    }
    lines.push("", result.message);
  } else if (result.command === "docs" && result.status !== "error") {
    const { page, pages, matches } = result.docs ?? {};
    if (page) lines.push(page.content.trimEnd());
    if (pages) {
      const width = Math.max(...pages.map((p) => p.path.length), 0) + 2;
      lines.push(
        ...pages.map((p) => `${p.path.padEnd(width)}${pc.dim(p.title)}`)
      );
    }
    if (matches) {
      lines.push(
        ...matches.map((m) => `${pc.cyan(`${m.path}:${m.line}`)}  ${m.text}`)
      );
    }
    if (!page && result.message) lines.push(pc.dim(result.message));
  } else {
    if (result.status === "error") {
      lines.push(`${pc.red("✗")} ${result.error?.message ?? result.message}`);
      const details = result.error?.details;
      if (details?.output) lines.push(pc.dim(indent(String(details.output))));
      if (details?.fix) lines.push(`  Try: ${pc.cyan(String(details.fix))}`);
      if (details?.docs) lines.push(`  See: ${details.docs}`);
      if (Array.isArray(details?.candidates)) {
        lines.push(
          ...(details.candidates as { dir: string }[]).map(
            (c) => `  --workspace ${c.dir}`
          )
        );
      }
    } else {
      const steps = result.plan?.steps ?? [];
      if (steps.length) {
        lines.push(
          pc.bold(
            result.dryRun || result.status === "action_required"
              ? "Planned changes:"
              : "Changes:"
          )
        );
        for (const step of steps)
          lines.push(`  ${pc.green("+")} ${step.summary}`);
        lines.push("");
      }
      const icon = result.status === "success" ? pc.green("✓") : pc.yellow("!");
      lines.push(`${icon} ${result.message}`);
    }
  }

  const required = result.actions.filter((a) => a.required);
  const optional = result.actions.filter((a) => !a.required);
  if (required.length)
    lines.push(
      "",
      pc.bold("Action required:"),
      ...required.flatMap(actionLines)
    );
  if (optional.length)
    lines.push("", pc.bold("Optional:"), ...optional.flatMap(actionLines));
  if (result.warnings.length) {
    lines.push(
      "",
      ...result.warnings.map((w) => `${pc.yellow("!")} ${w.message}`)
    );
  }
  if (
    result.status !== "error" &&
    result.command !== "doctor" &&
    result.command !== "docs" &&
    result.nextSteps.length
  ) {
    lines.push(
      "",
      pc.bold("Next:"),
      ...result.nextSteps.map(
        (s) => `  ${s.startsWith("#") ? pc.dim(s) : pc.cyan(s)}`
      )
    );
  }

  write();
};
