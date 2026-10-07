import fs from "node:fs";
import path from "node:path";
import { globToRegex } from "../env/gitignore";
import { toPosix } from "../detect/scan";
import templatesConfig from "../../templates.json";

export type RecipeName =
  | "next"
  | "next-ai"
  | "react-router"
  | "react-router-ai"
  | "tanstack-start"
  | "tanstack-start-ai"
  | "vinext"
  | "vinext-ai"
  | "vite"
  | "vite-ai"
  | "astro"
  | "astro-ai"
  | "hono"
  | "hono-ai"
  | "express"
  | "express-ai";

export interface TemplateManifest {
  cloudClientRange: string;
  pluginAiRange: string;
  /** The first cloud-client with Puck Pages and Puck Auth */
  cloudClientPagesRange: string;
  pluginPagesRange: string;
  pluginAuthRange: string;
}

export interface TemplateSource {
  /** Project-relative POSIX paths, with `.gitignore` under its real name */
  list(recipe: RecipeName): string[];
  read(recipe: RecipeName, file: string): Buffer;
  manifest(): TemplateManifest;
}

const excludeMatchers = templatesConfig.exclude.map((pattern) => {
  const dirPattern = pattern.endsWith("/**");
  const regex = globToRegex(dirPattern ? pattern.slice(0, -3) : pattern);
  return (rel: string) => {
    const parts = rel.split("/");
    if (dirPattern) return parts.slice(0, -1).some((part) => regex.test(part));
    return pattern.includes("/")
      ? regex.test(rel)
      : regex.test(parts[parts.length - 1]);
  };
});

export const isExcludedTemplateFile = (rel: string) =>
  excludeMatchers.some((m) => m(rel));

const walk = (dir: string, base = dir): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full, base)
      : [toPosix(path.relative(base, full))];
  });

/**
 * Reads recipes from a directory: `dist/templates` when published (where
 * `.gitignore` is stored as `_gitignore` because npm strips it), or the repo's
 * `recipes/` directory in tests.
 */
export class DirTemplateSource implements TemplateSource {
  #dir: string;
  #gitignoreName: string;
  #manifest: () => TemplateManifest;

  constructor(
    dir: string,
    opts: { gitignoreName: string; manifest: () => TemplateManifest }
  ) {
    this.#dir = dir;
    this.#gitignoreName = opts.gitignoreName;
    this.#manifest = opts.manifest;
  }

  list(recipe: RecipeName) {
    return walk(path.join(this.#dir, recipe))
      .map((rel) => this.#fromStored(rel))
      .filter((rel) => !isExcludedTemplateFile(rel))
      .sort();
  }

  read(recipe: RecipeName, file: string) {
    return fs.readFileSync(path.join(this.#dir, recipe, this.#toStored(file)));
  }

  manifest() {
    return this.#manifest();
  }

  #fromStored(rel: string) {
    const parts = rel.split("/");
    if (parts[parts.length - 1] === this.#gitignoreName)
      parts[parts.length - 1] = ".gitignore";
    return parts.join("/");
  }

  #toStored(rel: string) {
    const parts = rel.split("/");
    if (parts[parts.length - 1] === ".gitignore")
      parts[parts.length - 1] = this.#gitignoreName;
    return parts.join("/");
  }
}

export const templateText = (
  source: TemplateSource,
  recipe: RecipeName,
  file: string
) => source.read(recipe, file).toString("utf8");
