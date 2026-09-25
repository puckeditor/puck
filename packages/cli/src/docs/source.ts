import fs from "node:fs";
import path from "node:path";

export interface DocEntry {
  /** Page path, mirroring the URL: `api-reference/fields/text` is `/docs/api-reference/fields/text` */
  path: string;
  title: string;
}

export interface DocsSource {
  /** Every page, in sidebar order */
  list(): DocEntry[];
  read(page: string): string;
}

/**
 * Reads the markdown docs exported from `apps/docs` by `scripts/copy-docs.mjs`:
 * `dist/docs` when published, or a fixture directory in tests.
 */
export class DirDocsSource implements DocsSource {
  #dir: string;

  constructor(dir: string) {
    this.#dir = dir;
  }

  list(): DocEntry[] {
    return JSON.parse(
      fs.readFileSync(path.join(this.#dir, "index.json"), "utf8")
    );
  }

  read(page: string) {
    return fs.readFileSync(path.join(this.#dir, `${page}.md`), "utf8");
  }
}
