import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import type { RecipeName } from "../templates/source";
import { templateText } from "../templates/source";
import {
  relocateModule,
  RelocateOptions,
  RelocateResult,
  stripExtension,
} from "../templates/relocate";
import { CORE_PACKAGE } from "../constants";

export interface TemplateFile {
  /** Recipe-relative path */
  from: string;
  /** Project-relative path */
  to: string;
  /** Skip silently if the target already exists (e.g. database.json) */
  ifMissing?: boolean;
}

export type RelocateContext = Omit<RelocateOptions, "from" | "to">;

/** A recipe file's content as it should be written at `to` in this project */
export const renderTemplate = (
  p: Planner,
  recipe: RecipeName,
  from: string,
  to: string,
  opts: RelocateContext
): RelocateResult => {
  const raw = templateText(p.templates, recipe, from);
  if (!/\.(tsx?|jsx?)$/.test(from)) return { ok: true, code: raw };
  return relocateModule(raw, { ...opts, from, to });
};

const configManual = (
  p: Planner,
  capability: CapabilityId,
  file: string,
  reason: string
) =>
  p.manual({
    id: `${capability}:config-import:${file}`,
    type: "manual_edit",
    capability,
    required: true,
    file,
    reason: "unsupported_shape",
    message: reason,
    instructions: `Export your Puck config as the default export of ${p.state.puck.configFile}, then re-run the command.`,
  });

/** Writes recipe files into an existing project, relocating their imports */
export const copyTemplateFiles = (
  p: Planner,
  recipe: RecipeName,
  files: TemplateFile[],
  opts: RelocateContext,
  capability: CapabilityId = "editor"
) => {
  for (const file of files) {
    const rendered = renderTemplate(p, recipe, file.from, file.to, opts);
    if (!rendered.ok) {
      configManual(p, capability, file.to, rendered.reason);
      continue;
    }

    const outcome = p.createFile(file.to, rendered.code, {
      capability,
      ifMissing: file.ifMissing,
    });
    if (outcome === "conflict") {
      p.manual({
        id: `${capability}:conflict:${file.to}`,
        type: "manual_edit",
        capability,
        required: true,
        file: file.to,
        reason: "conflict",
        message: `${file.to} already exists with different content, so it was left untouched.`,
        instructions: `Merge the Puck ${recipe} recipe's ${file.from} into ${file.to}, or move your file and re-run the command.`,
        snippet: rendered.code,
      });
    }
  }
};

const normalizeEol = (text: string) => text.replace(/\r\n/g, "\n");

export type UpgradeOutcome = "upgraded" | "already" | "missing" | "customized";

/**
 * Replaces a file with a newer recipe's version, but only if it's still
 * exactly what the older recipe generated. Customised files are left alone.
 */
export const upgradeTemplateFile = (
  p: Planner,
  {
    fromRecipe,
    toRecipe,
    from,
    to,
    opts,
    capability,
    summary,
  }: {
    fromRecipe: RecipeName;
    toRecipe: RecipeName;
    from: string;
    to: string;
    opts: RelocateContext;
    capability: CapabilityId;
    summary: string;
  }
): UpgradeOutcome => {
  const current = p.vfs.readText(p.abs(to));
  if (current === null) return "missing";
  const same = (a: string, b: string) => normalizeEol(a) === normalizeEol(b);

  const next = renderTemplate(p, toRecipe, from, to, opts);
  if (!next.ok) {
    configManual(p, capability, to, next.reason);
    return "customized";
  }

  // Files are either relocated for this project, or verbatim when the app was
  // scaffolded from the recipe itself (keeping its ~/ aliases)
  const candidates = [
    {
      previous: renderTemplate(p, fromRecipe, from, to, opts),
      next: next.code,
    },
    {
      previous: {
        ok: true,
        code: templateText(p.templates, fromRecipe, from),
      } as const,
      next: templateText(p.templates, toRecipe, from),
    },
  ];

  if (candidates.some((c) => same(current, c.next))) return "already";
  const match = candidates.find(
    (c) => c.previous.ok && same(current, c.previous.code)
  );
  if (!match) return "customized";

  p.modifyFile(to, match.next, { capability, summary });
  return "upgraded";
};

/** Maps recipe module ids for the config, preferring the project's existing config */
export const configModuleTarget = (p: Planner) =>
  stripExtension(p.state.puck.configFile ?? "puck.config.tsx");

export const configRelocation = (p: Planner) =>
  p.state.puck.configExports
    ? { module: "puck.config", shape: p.state.puck.configExports }
    : undefined;

export const planPuckConfig = (p: Planner, recipe: RecipeName) => {
  if (p.state.puck.configFile) return;
  p.createFile(
    "puck.config.tsx",
    templateText(p.templates, recipe, "puck.config.tsx"),
    {
      capability: "editor",
      summary: "Create puck.config.tsx",
    }
  );
};

export const planCoreDependency = (p: Planner) => {
  if (!p.state.puck.installed)
    p.addDependency(CORE_PACKAGE, `^${p.cliVersion}`, "editor");
};
