// Exports the docs site (apps/docs) as markdown into dist/docs, so
// `puck docs` can serve the docs for this release offline.
//
// Usage: node scripts/copy-docs.mjs [--out <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportDocs } from "../../../apps/docs/scripts/markdown.mjs";

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFlag = process.argv.indexOf("--out");
const outDir =
  outFlag === -1
    ? path.join(pkgDir, "dist", "docs")
    : path.resolve(process.argv[outFlag + 1]);

const pages = await exportDocs();

fs.rmSync(outDir, { recursive: true, force: true });

for (const page of pages) {
  const file = path.join(outDir, `${page.path}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page.content);
}

fs.writeFileSync(
  path.join(outDir, "index.json"),
  JSON.stringify(
    pages.map(({ path, title }) => ({ path, title })),
    null,
    2
  ) + "\n"
);
