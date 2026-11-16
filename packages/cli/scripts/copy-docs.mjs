// Exports the docs site (apps/docs) as markdown into dist/docs, so
// `puck docs` can serve the docs for this release offline. Pages that only
// exist on the platform site, like the Puck AI docs, are pulled from its
// llms.txt and bundled alongside them.
//
// Usage: node scripts/copy-docs.mjs [--out <dir>] [--local]
//
// --local skips the platform docs. PUCK_DOCS_URL overrides the platform site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertPage,
  exportDocs,
} from "../../../apps/docs/scripts/markdown.mjs";

// `next.` carries platform docs ahead of their release on puckeditor.com
const DOCS_URL = process.env.PUCK_DOCS_URL ?? "https://next.puckeditor.com";

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFlag = process.argv.indexOf("--out");
const outDir =
  outFlag === -1
    ? path.join(pkgDir, "dist", "docs")
    : path.resolve(process.argv[outFlag + 1]);

const fetchText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetching ${url} failed: ${res.status}`);
  return res.text();
};

// Platform pages missing from apps/docs, spliced in after the page that
// precedes them in llms.txt. Local pages win, as they match this release.
const addPlatformDocs = async (pages) => {
  const llms = await fetchText(`${DOCS_URL}/llms.txt`);
  const section = llms.split(/^## /m).find((s) => s.startsWith("Docs\n")) ?? "";
  const listed = [
    ...section.matchAll(/^- \[(.+)\]\(\/docs\/(.+)\.md\)$/gm),
  ].map(([, title, path]) => ({ title, path }));

  if (listed.length === 0) throw new Error(`No docs in ${DOCS_URL}/llms.txt`);

  const local = new Set(pages.map((page) => page.path));
  const remote = await Promise.all(
    listed
      .filter((page) => !local.has(page.path))
      .map(async (page) => {
        const url = `/docs/${page.path}`;
        const { title, content } = convertPage(
          await fetchText(`${DOCS_URL}${url}.md`),
          url
        );
        return { ...page, title: page.title || title, content };
      })
  );

  let anchor = -1;
  for (const page of listed) {
    const added = remote.find((r) => r.path === page.path);
    if (added) pages.splice(++anchor, 0, added);
    else anchor = pages.findIndex((p) => p.path === page.path);
  }
};

const pages = await exportDocs();
if (!process.argv.includes("--local")) await addPlatformDocs(pages);

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
