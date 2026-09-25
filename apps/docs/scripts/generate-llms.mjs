// Writes the agent-readable docs into `public/`:
//
//   /docs/<path>.md   each page as markdown
//   /llms.txt         an index of those pages (https://llmstxt.org)
//   /llms-full.txt    every page in one file

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportDocs } from "./markdown.mjs";

const docsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(docsDir, "public");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(docsDir, "package.json"), "utf8")
);

// Mirrors `basePath` in next.config.mjs, so versioned deployments link to their
// own pages
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
const basePath = branch.startsWith("releases/")
  ? `/v/${packageJson.version}`
  : process.env.NEXT_PUBLIC_IS_CANARY
  ? "/v/canary"
  : "";
const siteUrl = `https://puckeditor.com${basePath}`;

const SECTION_TITLES = {
  "integrating-puck": "Integrating Puck",
  "extending-puck": "Extending Puck",
  "api-reference": "API Reference",
  guides: "Guides",
};

const pages = await exportDocs();
const markdownUrl = (page) => `${siteUrl}/docs/${page.path}.md`;

fs.rmSync(path.join(publicDir, "docs"), { recursive: true, force: true });

for (const page of pages) {
  const file = path.join(publicDir, "docs", `${page.path}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page.content);
}

const sections = new Map([["Docs", []]]);

for (const page of pages) {
  const title = SECTION_TITLES[page.path.split("/")[0]] ?? "Docs";
  if (!sections.has(title)) sections.set(title, []);
  sections.get(title).push(`- [${page.title}](${markdownUrl(page)})`);
}

const index = [
  "# Puck",
  "",
  "> Puck is a modular, open-source visual editor for React. Use it to build custom drag-and-drop experiences with your own React components.",
  "",
  `Set up Puck in a new or existing app with \`npx @puckeditor/cli init\`. Agents should run \`npx @puckeditor/cli init --yes --json\` and read ${siteUrl}/agents.md first.`,
  "",
  ...[...sections].flatMap(([title, links]) => [
    `## ${title}`,
    "",
    ...links,
    "",
  ]),
].join("\n");

const full = pages
  .map((page) => `<!-- Source: ${siteUrl}${page.url} -->\n\n${page.content}`)
  .join("\n---\n\n");

fs.writeFileSync(path.join(publicDir, "llms.txt"), index);
fs.writeFileSync(path.join(publicDir, "llms-full.txt"), full);

console.log(`Wrote ${pages.length} markdown pages, llms.txt and llms-full.txt`);
