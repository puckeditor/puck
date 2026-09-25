// Converts the docs pages to plain markdown for agents: the CLI bundles the
// output (`puck docs`) and the site serves it (`/llms.txt`, `/docs/*.md`).
//
// Edits are spliced into the original source by node position rather than
// re-serialized, so the markdown keeps its hand-written formatting.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";

export const PAGES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "pages",
  "docs"
);

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkFrontmatter)
  .use(remarkGfm);

// `_meta.js` files are ES modules in a CommonJS package. Importing them as data
// URLs sidesteps Node's module type detection.
const readMeta = async (dir) => {
  const file = path.join(dir, "_meta.js");
  if (!fs.existsSync(file)) return {};

  const source = fs.readFileSync(file, "utf8");
  const mod = await import(
    `data:text/javascript,${encodeURIComponent(source)}`
  );

  return mod.default ?? {};
};

// Page slugs in sidebar order: `_meta.js` keys first, then the rest
// alphabetically. A page and a directory can share a slug, in which case the
// page comes before its children.
const walk = async (dir, prefix = "") => {
  const meta = await readMeta(dir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const slugs = new Set();

  for (const entry of entries) {
    if (entry.isDirectory()) slugs.add(entry.name);
    else if (entry.name.endsWith(".mdx")) slugs.add(entry.name.slice(0, -4));
  }

  const ordered = [
    ...Object.keys(meta).filter((slug) => slugs.has(slug)),
    ...[...slugs].filter((slug) => !(slug in meta)).sort(),
  ];

  const pages = [];

  for (const slug of ordered) {
    const file = path.join(dir, `${slug}.mdx`);
    const subdir = path.join(dir, slug);

    if (fs.existsSync(file)) pages.push({ path: `${prefix}${slug}`, file });
    if (fs.existsSync(subdir) && fs.statSync(subdir).isDirectory()) {
      pages.push(...(await walk(subdir, `${prefix}${slug}/`)));
    }
  }

  return pages;
};

const offsets = (node) => [
  node.position.start.offset,
  node.position.end.offset,
];

const splice = (source, start, end, edits) => {
  let out = "";
  let cursor = start;

  for (const edit of edits) {
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }

  return out + source.slice(cursor, end);
};

// Converted source for the range covering `nodes`
const convertNodes = (source, nodes, ctx) => {
  if (nodes.length === 0) return "";

  const start = nodes[0].position.start.offset;
  const end = nodes[nodes.length - 1].position.end.offset;

  return splice(source, start, end, collectEdits(source, nodes, ctx));
};

const dedent = (text) => {
  const [first, ...rest] = text.split("\n");
  const indents = rest
    .filter((line) => line.trim())
    .map((line) => line.match(/^ */)[0].length);
  const indent = indents.length ? Math.min(...indents) : 0;

  return [first, ...rest.map((line) => line.slice(indent))].join("\n");
};

const attribute = (node, name) =>
  node.attributes?.find((attr) => attr.name === name)?.value;

const isRelative = (url) => !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url);

const editFor = (source, node, ctx) => {
  switch (node.type) {
    case "yaml":
    case "toml":
    case "mdxjsEsm":
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return "";

    case "mdxJsxFlowElement": {
      // Live previews repeat the code block next to them, so they're dropped
      if (node.name !== "Callout") return "";

      const label = attribute(node, "type") === "warning" ? "Warning" : "Note";
      const body = dedent(convertNodes(source, node.children, ctx)).trim();

      return body
        .split("\n")
        .map((line, i) => {
          const text = i === 0 ? `**${label}:** ${line}` : line;
          return text ? `> ${text}` : ">";
        })
        .join("\n");
    }

    case "mdxJsxTextElement":
      return convertNodes(source, node.children, ctx);

    case "code": {
      // Keep the language, drop Nextra meta like `copy` and `{5-7}`
      const raw = source.slice(...offsets(node));
      const newline = raw.indexOf("\n");
      if (newline === -1) return undefined;

      const fence = raw.match(/^(`{3,}|~{3,})/)?.[1];
      if (!fence) return undefined; // indented code block

      const filename = node.meta?.match(/filename="([^"]+)"/)?.[1];
      const indent = " ".repeat(node.position.start.column - 1);
      const code = `${fence}${node.lang ?? ""}${raw.slice(newline)}`;

      return filename ? `File: \`${filename}\`\n\n${indent}${code}` : code;
    }

    case "link": {
      // Resolve relative links the way the browser would on the live page,
      // so they work outside of it
      const raw = source.slice(...offsets(node));
      if (!raw.startsWith("[") || !isRelative(node.url)) return undefined;

      const url = new URL(node.url, `https://puckeditor.com${ctx.url}`);
      const text = convertNodes(source, node.children, ctx);

      return `[${text}](${url.pathname}${url.hash})`;
    }

    default:
      return undefined;
  }
};

const collectEdits = (source, nodes, ctx) => {
  const edits = [];

  for (const node of nodes) {
    const text = editFor(source, node, ctx);

    if (text !== undefined) {
      const [start, end] = offsets(node);
      edits.push({ start, end, text });
    } else if (node.children) {
      edits.push(...collectEdits(source, node.children, ctx));
    }
  }

  return edits;
};

// Tidy the gaps left by removed nodes, leaving code blocks untouched
const tidy = (markdown) => {
  const lines = [];
  let fence = null;

  for (const line of markdown.split("\n")) {
    const marker = line.trim().match(/^(`{3,}|~{3,})/)?.[1];

    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
      }
      lines.push(line);
      continue;
    }

    if (marker) fence = marker;

    const trimmed = fence ? line : line.trimEnd();
    if (!trimmed && !lines[lines.length - 1]) continue;

    lines.push(trimmed);
  }

  return `${lines.join("\n").trim()}\n`;
};

const plain = (text) => text.replace(/\\(.)/g, "$1").replace(/`/g, "").trim();

export const convertPage = (source, url) => {
  const tree = processor.parse(source);
  const markdown = tidy(
    splice(
      source,
      0,
      source.length,
      collectEdits(source, tree.children, { url })
    )
  );

  const frontmatter = tree.children.find((node) => node.type === "yaml");
  const frontmatterTitle = frontmatter?.value.match(/^title:\s*(.+)$/m)?.[1];
  const heading = markdown.match(/^# (.+)$/m)?.[1];

  const title = frontmatterTitle
    ? frontmatterTitle.replace(/^(["'])(.*)\1$/, "$2")
    : heading && plain(heading);

  return { title, content: markdown };
};

/**
 * Every docs page as markdown, in sidebar order
 *
 * `path` mirrors the URL: `index` is `/docs`, `api-reference/fields/text` is
 * `/docs/api-reference/fields/text`.
 */
export const exportDocs = async (pagesDir = PAGES_DIR) => {
  const pages = await walk(pagesDir);

  return pages.map((page) => {
    const url = page.path === "index" ? "/docs" : `/docs/${page.path}`;
    const { title, content } = convertPage(
      fs.readFileSync(page.file, "utf8"),
      url
    );

    return {
      path: page.path,
      title: title || path.basename(page.path),
      url,
      content,
    };
  });
};
