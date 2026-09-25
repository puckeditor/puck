import path from "node:path";
import type { ExportShape } from "../ast/exports";
import { getModuleReferences } from "../ast/imports";
import { parseModule } from "../ast/parse";
import { applyEdits, TextEdit } from "../ast/splice";

const posix = path.posix;

export const stripExtension = (file: string) =>
  file.replace(/\.(tsx?|jsx?|mjs|cjs|mts|cts)$/, "");

export interface RelocateOptions {
  /** Recipe-relative path of the template file */
  from: string;
  /** Project-relative path the file will be written to */
  to: string;
  /** Recipe module id (no extension) → project module id (no extension) */
  moduleMap: Record<string, string>;
  /** Import alias prefixes used by the recipe, e.g. { "~/": "app/" } */
  aliases?: Record<string, string>;
  /** The recipe module id of the Puck config, and the shape of the project's config */
  config?: { module: string; shape: ExportShape };
}

export type RelocateResult =
  | { ok: true; code: string }
  | { ok: false; reason: string };

const relativeSpecifier = (fromFile: string, toModule: string) => {
  const rel = posix.relative(posix.dirname(fromFile), toModule);
  return rel.startsWith(".") ? rel : `./${rel}`;
};

const configImportClause = (
  shape: ExportShape,
  local: string
): string | null => {
  if (shape.default) return local;
  if (shape.named.includes("config"))
    return local === "config" ? "{ config }" : `{ config as ${local} }`;
  if (shape.named.length === 1) return `{ ${shape.named[0]} as ${local} }`;
  return null;
};

const TYPE_FALLBACKS: Record<string, string> = {
  UserData: 'import("@puckeditor/core").Data',
};

/**
 * Rewrites a recipe file's relative and aliased imports so they resolve from
 * its new location, and adapts the Puck config import to whatever the
 * project's config actually exports.
 */
export const relocateModule = (
  code: string,
  opts: RelocateOptions
): RelocateResult => {
  const ast = parseModule(code, opts.from);
  const edits: TextEdit[] = [];

  for (const ref of getModuleReferences(ast, code)) {
    let recipeModule: string | null = null;

    if (ref.source.startsWith(".")) {
      recipeModule = posix.normalize(
        posix.join(posix.dirname(opts.from), ref.source)
      );
    } else {
      for (const [alias, target] of Object.entries(opts.aliases ?? {})) {
        if (ref.source.startsWith(alias)) {
          recipeModule = posix.normalize(
            target + ref.source.slice(alias.length)
          );
        }
      }
    }

    if (recipeModule === null) continue;
    const target = opts.moduleMap[stripExtension(recipeModule)];
    if (target === undefined) continue;

    const specifier = relativeSpecifier(opts.to, target);

    // Recipe configs export helper types (e.g. UserData) that user configs may not
    if (
      opts.config &&
      stripExtension(recipeModule) === opts.config.module &&
      ref.kind === "import" &&
      ref.typeOnly
    ) {
      const exported = opts.config.shape.types ?? [];
      const missing = ref.specifiers.filter(
        (s) => !exported.includes(s.imported)
      );
      if (missing.length > 0) {
        if (missing.some((s) => !TYPE_FALLBACKS[s.imported])) {
          return {
            ok: false,
            reason: `Your Puck config doesn't export the types ${
              opts.to
            } needs (${missing.map((s) => s.imported).join(", ")})`,
          };
        }
        const kept = ref.specifiers.filter((s) =>
          exported.includes(s.imported)
        );
        const q = ref.quote;
        const lines = kept.length
          ? [
              `import type { ${kept
                .map((s) =>
                  s.imported === s.local
                    ? s.local
                    : `${s.imported} as ${s.local}`
                )
                .join(", ")} } from ${q}${specifier}${q};`,
            ]
          : [];
        lines.push(
          ...missing.map(
            (s) => `type ${s.local} = ${TYPE_FALLBACKS[s.imported]};`
          )
        );
        edits.push({
          start: ref.statementStart,
          end: ref.statementEnd,
          text: lines.join("\n"),
        });
        continue;
      }
    }

    if (
      opts.config &&
      stripExtension(recipeModule) === opts.config.module &&
      ref.kind === "import"
    ) {
      const valueSpecs = ref.specifiers.filter((s) => !s.typeOnly);
      const needsDefault = valueSpecs.some((s) => s.kind === "default");
      const needsNamed = valueSpecs.some(
        (s) => s.kind === "named" && s.imported === "config"
      );
      const satisfied =
        (!needsDefault || opts.config.shape.default) &&
        (!needsNamed || opts.config.shape.named.includes("config"));

      if (!satisfied) {
        const spec = valueSpecs[0];
        const clause =
          valueSpecs.length === 1
            ? configImportClause(opts.config.shape, spec.local)
            : null;
        if (!clause) {
          return {
            ok: false,
            reason: `Your Puck config doesn't export a default or \`config\` export that ${opts.to} can import`,
          };
        }
        const q = ref.quote;
        edits.push({
          start: ref.statementStart,
          end: ref.statementEnd,
          text: `import ${clause} from ${q}${specifier}${q};`,
        });
        continue;
      }
    }

    if (specifier !== ref.source) {
      edits.push({
        start: ref.sourceStart,
        end: ref.sourceEnd,
        text: `${ref.quote}${specifier}${ref.quote}`,
      });
    }
  }

  return { ok: true, code: applyEdits(code, edits) };
};
