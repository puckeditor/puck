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
import { withSameRouteAuth } from "../templates/auth";

export interface TemplateFile {
  /** Recipe-relative path */
  from: string;
  /** Project-relative path */
  to: string;
  /** Skip silently if the target already exists (e.g. database.json) */
  ifMissing?: boolean;
}

export type RelocateContext = Omit<RelocateOptions, "from" | "to">;

/** Code written as if it were the recipe file `from`, relocated to `to` */
export const renderCode = (
  raw: string,
  from: string,
  to: string,
  opts: RelocateContext
): RelocateResult => {
  if (!/\.(tsx?|jsx?)$/.test(from)) return { ok: true, code: raw };
  return relocateModule(raw, { ...opts, from, to });
};

/** A recipe file's content as it should be written at `to` in this project */
export const renderTemplate = (
  p: Planner,
  recipe: RecipeName,
  from: string,
  to: string,
  opts: RelocateContext
): RelocateResult =>
  renderCode(templateText(p.templates, recipe, from), from, to, opts);

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

/**
 * Rewrites a file the CLI generated into another known version of it, e.g. a
 * recipe editor into a Puck Pages editor. `source` gives each version in
 * recipe coordinates; the file must match one of `combos` exactly, either
 * relocated for this project or verbatim as scaffolded. The matched version's
 * flags are merged with `want` to pick the new one.
 */
export const upgradeVariant = <F extends object>(
  p: Planner,
  {
    from,
    to,
    opts,
    combos,
    source,
    want,
    capability,
    summary,
  }: {
    from: string;
    to: string;
    opts: RelocateContext;
    combos: F[];
    source: (flags: F) => string | null;
    want: Partial<F>;
    capability: CapabilityId;
    summary: string;
  }
): UpgradeOutcome => {
  const current = p.vfs.readText(p.abs(to));
  if (current === null) return "missing";
  const same = (a: string, b: string) => normalizeEol(a) === normalizeEol(b);
  const forms = (flags: F) => {
    const raw = source(flags);
    if (raw === null) return null;
    const relocated = renderCode(raw, from, to, opts);
    return { relocated: relocated.ok ? relocated.code : null, verbatim: raw };
  };

  for (const combo of combos) {
    const known = forms(combo);
    if (!known) continue;
    const form = [known.relocated, known.verbatim].findIndex(
      (code) => code !== null && same(current, code)
    );
    if (form === -1) continue;

    const wanted = forms({ ...combo, ...want });
    const code = wanted && [wanted.relocated, wanted.verbatim][form];
    if (!code) return "customized";
    if (same(current, code)) return "already";
    p.modifyFile(to, code, { capability, summary });
    return "upgraded";
  }

  return "customized";
};

/** Every combination of boolean flags, e.g. for upgradeVariant's combos */
export const flagCombos = <K extends string>(
  ...keys: K[]
): Record<K, boolean>[] =>
  keys.reduce<Record<K, boolean>[]>(
    (combos, key) =>
      combos.flatMap((c) => [
        { ...c, [key]: false },
        { ...c, [key]: true },
      ]),
    [{} as Record<K, boolean>]
  );

/** Maps recipe module ids for the config, preferring the project's existing config */
export const configModuleTarget = (p: Planner, created = "puck.config.tsx") =>
  stripExtension(p.state.puck.configFile ?? created);

export const configRelocation = (p: Planner) =>
  p.state.puck.configExports
    ? { module: "puck.config", shape: p.state.puck.configExports }
    : undefined;

export const planPuckConfig = (
  p: Planner,
  recipe: RecipeName,
  { from = "puck.config.tsx", to = "puck.config.tsx" } = {}
) => {
  if (p.state.puck.configFile) return;
  p.createFile(to, templateText(p.templates, recipe, from), {
    capability: "editor",
    summary: `Create ${to}`,
  });
};

export const planCoreDependency = (p: Planner) => {
  if (!p.state.puck.installed)
    p.addDependency(CORE_PACKAGE, `^${p.cliVersion}`, "editor");
};

/** Enables Puck AI in a Cloud route the CLI wrote, keeping its authenticate */
export const planAiRoute = (
  p: Planner,
  file: string,
  cloudRoute: string,
  aiRoute: string,
  { warn = true }: { warn?: boolean } = {}
) => {
  const current = p.vfs.readText(p.abs(file)) ?? "";
  const upgraded = withSameRouteAuth(
    current,
    cloudRoute,
    aiRoute,
    file,
    p.cloudHost
  );
  if (upgraded !== null) {
    p.modifyFile(file, upgraded, {
      capability: "ai",
      summary: `Enable Puck AI in ${file}`,
    });
  } else if (
    warn &&
    withSameRouteAuth(current, aiRoute, aiRoute, file, p.cloudHost) === null
  ) {
    p.warn(
      "PUCK-CLI-W-AI-ROUTE",
      `Make sure the puckHandler in ${file} sets ai.designMode.allowed to true, or Puck AI's design mode will be rejected.`
    );
  }
};
